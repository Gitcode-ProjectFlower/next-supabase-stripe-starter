import * as XLSX from 'xlsx-js-style';

import {
  buildCombinedWorkbook,
  extractRunValues,
  runTitle,
  type CombinedItem,
  type CombinedRun,
} from '@/libs/combined-export';
import { inngest } from '@/libs/inngest/client';
import type { InputSnapshot } from '@/libs/input-snapshot';
import { supabaseAdminClient } from '@/libs/supabase/supabase-admin';

export const exportCombinedJob = inngest.createFunction(
  {
    id: 'export-combined-job',
    name: 'Export Combined Selection Workbook',
    retries: 1,
  },
  { event: 'selections/export-combined' },
  async ({ event, step }) => {
    const { selectionId, userId } = event.data;

    if (!selectionId || !userId) {
      throw new Error('Missing required parameters: selectionId or userId');
    }

    const items = await step.run('fetch-selection-items', async () => {
      const { data: selection, error: selectionError } = await supabaseAdminClient
        .from('selections')
        .select('id, user_id')
        .eq('id', selectionId)
        .single();

      if (selectionError || !selection || (selection as any).user_id !== userId) {
        throw new Error('Selection not found or access denied');
      }

      const { data, error } = await supabaseAdminClient
        .from('selection_items')
        .select('*')
        .eq('selection_id', selectionId)
        .order('similarity', { ascending: false });

      if (error) throw new Error(`Failed to fetch selection items: ${error.message}`);
      if (!data || data.length === 0) throw new Error('Cannot export: Selection has no items');
      return (data || []) as CombinedItem[];
    });

    const runRows = await step.run('fetch-analysis-runs', async () => {
      const { data: sessions, error: sessionsError } = await supabaseAdminClient
        .from('qa_sessions')
        .select('id, prompt, standard_question_id, input_snapshot, created_at')
        .eq('selection_id', selectionId)
        .eq('user_id', userId)
        .eq('status', 'completed')
        .order('created_at', { ascending: true });

      if (sessionsError) throw new Error(`Failed to fetch analysis runs: ${sessionsError.message}`);
      if (!sessions || sessions.length === 0)
        return [] as {
          sessionId: string;
          title: string;
          sqId: string | null;
          createdAt: string;
          companyCount: number;
          values: Array<[string, Array<string | number>]>;
          statuses: [string, string][];
          inputSnapshot: InputSnapshot | null;
        }[];

      const sessionIds = (sessions as any[]).map((s) => s.id);
      const { data: answers, error: answersError } = await supabaseAdminClient
        .from('qa_answers')
        .select('session_id, doc_id, answer, status')
        .in('session_id', sessionIds);

      if (answersError) throw new Error(`Failed to fetch answers: ${answersError.message}`);

      const bySession = new Map<string, any[]>();
      for (const a of (answers as any[]) || []) {
        const list = bySession.get(a.session_id) || [];
        list.push(a);
        bySession.set(a.session_id, list);
      }

      return (sessions as any[]).map((s) => {
        const { title, sqId } = runTitle(s);
        const values: Array<[string, Array<string | number>]> = [];
        const statuses: [string, string][] = [];
        for (const a of bySession.get(s.id) || []) {
          statuses.push([a.doc_id, a.status === 'success' ? 'success' : 'failed']);
          const v = extractRunValues(sqId, a.answer, a.status);
          if (v) values.push([a.doc_id, v]);
        }
        return {
          sessionId: s.id,
          title,
          sqId,
          createdAt: s.created_at,
          companyCount: (bySession.get(s.id) || []).length,
          values,
          statuses,
          inputSnapshot: (s.input_snapshot as InputSnapshot | null) || null,
        };
      });
    });

    const runs: CombinedRun[] = runRows.map((r) => ({
      sessionId: r.sessionId,
      title: r.title,
      sqId: r.sqId,
      createdAt: r.createdAt,
      companyCount: r.companyCount,
      valuesByDocId: new Map(r.values),
      statusByDocId: new Map(r.statuses),
      inputSnapshot: r.inputSnapshot,
    }));

    const downloadUrl = await step.run('generate-and-upload-excel', async () => {
      const wb = buildCombinedWorkbook(items, runs);
      const xlsxArray = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as Uint8Array;
      const xlsxBuffer = Buffer.from(xlsxArray);

      const fileName = `combined_${selectionId}_${Date.now()}.xlsx`;
      const filePath = `${userId}/${selectionId}/${fileName}`;

      const { error: uploadError } = await supabaseAdminClient.storage.from('exports').upload(filePath, xlsxBuffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        upsert: false,
      });

      if (uploadError) throw new Error(`Failed to upload Excel file: ${uploadError.message}`);

      const { data: urlData } = await supabaseAdminClient.storage
        .from('exports')
        .createSignedUrl(filePath, 60 * 60 * 24 * 30);
      if (!urlData) throw new Error('Failed to create signed URL');

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      await supabaseAdminClient.from('downloads').insert({
        user_id: userId,
        selection_id: selectionId,
        type: 'qa',
        url: urlData.signedUrl,
        row_count: items.length,
        expires_at: expiresAt.toISOString(),
      });

      try {
        await supabaseAdminClient.from('usage_log').insert({
          user_id: userId,
          action: 'record_download',
          count: items.length,
        });
      } catch (usageError) {
        console.error('[Inngest exportCombinedJob] Failed to log usage (non-critical):', usageError);
      }

      return urlData.signedUrl;
    });

    await step.run('send-email-notification', async () => {
      const { data } = await supabaseAdminClient.auth.admin.getUserById(userId);
      const { data: selection } = await supabaseAdminClient
        .from('selections')
        .select('name')
        .eq('id', selectionId)
        .single();
      if (data?.user?.email) {
        const { sendExportReadyEmail } = await import('@/libs/resend/email-helpers');
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + 30);
        await sendExportReadyEmail({
          userEmail: data.user.email,
          userName: data.user.user_metadata?.name,
          downloadLink: downloadUrl,
          selectionName: (selection as any)?.name || 'Your selection',
          fileSize: `${items.length} rows`,
          expiresIn: expirationDate.toISOString(),
        });
      }
    });

    return { selectionId, exported: items.length, runs: runs.length, downloadUrl };
  }
);
