import { NextRequest, NextResponse } from 'next/server';

import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';
import { logUsage } from '@/libs/usage-tracking';

/**
 * POST /api/downloads/[id]/download
 * Logs the download action and returns the download URL
 * This ensures record_download is logged when user actually downloads the file
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

    // Log the download usage
    console.log('[Download API] Logging record_download usage:', {
      userId: user.id,
      downloadId,
      downloadType: download.type,
      rowCount: download.row_count,
    });

    try {
      await logUsage(user.id, 'record_download', download.row_count || 0);
      console.log('[Download API] record_download usage logged successfully');
    } catch (usageError) {
      console.error('[Download API] Failed to log usage (non-critical):', {
        error: usageError instanceof Error ? usageError.message : String(usageError),
        userId: user.id,
        downloadId,
        rowCount: download.row_count,
      });
      // Continue even if logging fails - still allow download
    }

    // Return the download URL
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
