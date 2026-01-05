import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';
import { NextResponse } from 'next/server';

/**
 * GET /api/downloads
 * Fetch user's available downloads (CSV exports)
 */
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch downloads that haven't expired
    const { data: downloads, error } = await supabase
      .from('downloads')
      .select('id, type, selection_id, url, created_at, expires_at, row_count')
      .eq('user_id', user.id)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Downloads API] Error fetching downloads:', error);
      return NextResponse.json({ error: 'Failed to fetch downloads' }, { status: 500 });
    }

    // Format downloads with selection names if available
    const formattedDownloads = await Promise.all(
      (downloads || []).map(async (download: any) => {
        let selectionName: string | undefined;

        if (download.selection_id) {
          const { data: selection } = await supabase
            .from('selections')
            .select('name')
            .eq('id', download.selection_id)
            .single();

          // @ts-ignore - Supabase type inference issue with select queries
          selectionName = selection?.name;
        }

        // Calculate file size (rough estimate: ~200 bytes per row)
        const estimatedSizeKB = Math.round((download.row_count * 200) / 1024);
        const size = estimatedSizeKB > 0 ? `${estimatedSizeKB} KB` : '< 1 KB';

        return {
          id: download.id,
          type: download.type === 'lookalike' ? 'Lookalike CSV' : 'Q&A CSV',
          selectionId: download.selection_id,
          selectionName,
          createdAt: download.created_at,
          expiresAt: download.expires_at,
          size,
          downloadUrl: download.url,
        };
      })
    );

    return NextResponse.json({ downloads: formattedDownloads });
  } catch (error) {
    console.error('[Downloads API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
