import { inngest } from '@/libs/inngest/client';
import { supabaseAdminClient } from '@/libs/supabase/supabase-admin';

export const exportLookalikesJob = inngest.createFunction(
  {
    id: 'export-lookalikes-job',
    name: 'Export Lookalikes to CSV',
    retries: 1,
  },
  { event: 'lookalikes/export' },
  async ({ event, step }) => {
    const { selectionId, userId } = event.data;

    // Wrap entire function in try-catch to ensure errors are logged
    try {
      console.log('[Inngest exportLookalikesJob] ===== FUNCTION STARTED =====');
      console.log('[Inngest exportLookalikesJob] Event received:', {
        eventName: event.name,
        eventData: event.data,
      });

      if (!selectionId || !userId) {
        const error = new Error('Missing required parameters: selectionId or userId');
        console.error('[Inngest exportLookalikesJob] Missing parameters:', {
          selectionId: !!selectionId,
          userId: !!userId,
        });
        throw error;
      }

      console.log(`[Inngest exportLookalikesJob] Starting Lookalikes CSV export for selection ${selectionId}`);

      const items = await step.run('fetch-selection-items', async () => {
        const supabase = supabaseAdminClient;

        const { data, error } = await supabase
          .from('selection_items')
          .select('*')
          .eq('selection_id', selectionId)
          .order('similarity', { ascending: false });

        if (error) {
          throw new Error(`Failed to fetch selection items: ${error.message}`);
        }

        return data || [];
      });

      console.log(`[Inngest exportLookalikesJob] Found ${items.length} items to export`);

      // Validate that there are items to export
      if (!items || items.length === 0) {
        const error = new Error('Cannot export: Selection has no items');
        console.error('[Inngest exportLookalikesJob] No items found for selection:', selectionId);
        throw error;
      }

      const downloadUrl = await step.run('generate-and-upload-csv', async () => {
        const supabase = supabaseAdminClient;

        const headers = ['Name', 'Email', 'Phone', 'City', 'Street', 'Sectors', 'Experience Years', 'Similarity'];

        const rows = items.map((item) => [
          item.name || '',
          item.email || '',
          item.phone || '',
          item.city || '',
          item.street || '',
          Array.isArray(item.sectors) ? item.sectors.join('; ') : '',
          item.experience_years?.toString() || '',
          item.similarity?.toFixed(4) || '',
        ]);

        const csvContent = [headers.join(','), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(','))].join(
          '\n'
        );

        const csvWithBOM = '\uFEFF' + csvContent;

        const fileName = `lookalikes_${selectionId}_${Date.now()}.csv`;
        const filePath = `${userId}/${selectionId}/${fileName}`;

        const { error: uploadError } = await supabase.storage.from('exports').upload(filePath, csvWithBOM, {
          contentType: 'text/csv',
          upsert: false,
        });

        if (uploadError) {
          throw new Error(`Failed to upload CSV: ${uploadError.message}`);
        }

        const { data: urlData } = await supabase.storage.from('exports').createSignedUrl(filePath, 60 * 60 * 24 * 7);

        if (!urlData) {
          throw new Error('Failed to create signed URL');
        }

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        await supabase.from('downloads').insert({
          user_id: userId,
          selection_id: selectionId,
          type: 'lookalikes',
          url: urlData.signedUrl,
          row_count: items.length,
          expires_at: expiresAt.toISOString(),
        });

        return urlData.signedUrl;
      });

      await step.run('send-email-notification', async () => {
        const supabase = supabaseAdminClient;

        // Get user email and selection name
        const { data } = await supabase.auth.admin.getUserById(userId);
        const { data: selection } = await supabase.from('selections').select('name').eq('id', selectionId).single();

        if (data?.user?.email) {
          console.log(`Attempting to send email to ${data.user.email}`);
          const { sendExportReadyEmail } = await import('@/libs/resend/email-helpers');

          // Calculate expiration date (7 days from now)
          const expirationDate = new Date();
          expirationDate.setDate(expirationDate.getDate() + 7);

          const result = await sendExportReadyEmail({
            userEmail: data.user.email,
            userName: data.user.user_metadata?.name,
            downloadLink: downloadUrl,
            selectionName: selection?.name || 'Your selection',
            fileSize: `${items.length} rows`,
            expiresIn: expirationDate.toISOString(),
          });

          if (result.success) {
            console.log(`Export ready email sent successfully to ${data.user.email}`);
          } else {
            console.error(`Failed to send export ready email:`, result.error);
          }
        } else {
          console.warn(`[Inngest exportLookalikesJob] Could not send email: User email not found for userId ${userId}`);
          console.log('[Inngest exportLookalikesJob] User data:', JSON.stringify(data?.user, null, 2));
        }
      });

      console.log(`[Inngest exportLookalikesJob] Lookalikes CSV export completed. Download URL: ${downloadUrl}`);

      return {
        selectionId,
        exported: items.length,
        downloadUrl,
      };
    } catch (error) {
      // Catch any unhandled errors and log them
      console.error('[Inngest exportLookalikesJob] ===== FUNCTION FAILED WITH ERROR =====');
      console.error('[Inngest exportLookalikesJob] Error details:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        selectionId,
        userId,
      });

      // Re-throw the error so Inngest can retry if configured
      throw error;
    }
  }
);
