import { NextRequest, NextResponse } from 'next/server';

import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';

/**
 * POST /api/downloads/[id]/download
 * Returns the download URL for an existing export.
 *
 * Usage is intentionally NOT logged here. record_download is logged once
 * at file-creation time inside the Inngest jobs (export-lookalikes.ts and
 * process-qa.ts). Logging again on actual download would double-count
 * (and triple-count on every re-download), which inflates the usage meter.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: downloadId } = await params;
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch the download record to verify ownership and get row_count
    const { data: download, error: downloadError } = await supabase
      .from('downloads')
      .select('id, user_id, type, url, row_count, expires_at')
      .eq('id', downloadId)
      .single<{
        id: string;
        user_id: string;
        type: string;
        url: string;
        row_count: number;
        expires_at: string | null;
      }>();

    if (downloadError || !download) {
      console.error('[Download API] Download not found:', {
        downloadId,
        error: downloadError?.message,
      });
      return NextResponse.json({ error: 'Download not found' }, { status: 404 });
    }

    // Verify ownership
    if (download.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if download has expired
    if (download.expires_at && new Date(download.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Download has expired' }, { status: 410 });
    }

    return NextResponse.json({
      downloadUrl: download.url,
      type: download.type,
      rowCount: download.row_count,
    });
  } catch (error) {
    console.error('[Download API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
