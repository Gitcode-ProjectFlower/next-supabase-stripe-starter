import { inngest } from '@/libs/inngest/client';
import { supabaseAdminClient } from '@/libs/supabase/supabase-admin';

/**
 * TTL Cleanup Job
 *
 * Runs daily at 3:00 AM to clean up expired data:
 * - Selections older than 7 days (expires_at < NOW())
 * - Downloads older than 7 days (expires_at < NOW())
 * - Associated CSV files from Supabase Storage
 */
export const cleanupExpiredData = inngest.createFunction(
  {
    id: 'cleanup-expired-data',
    name: 'Cleanup Expired Data (TTL)',
    retries: 2,
  },
  { cron: '0 3 * * *' }, // Every day at 3:00 AM
  async ({ step }) => {
    const now = new Date().toISOString();

    // Step 1: Delete expired downloads and their files
    const deletedDownloads = await step.run('delete-expired-downloads', async () => {
      const supabase = supabaseAdminClient;

      // Fetch expired downloads to get file URLs
      const { data: expiredDownloads, error: fetchError } = await supabase
        .from('downloads')
        .select('id, url')
        .lt('expires_at', now);

      if (fetchError) {
        console.error('Error fetching expired downloads:', fetchError);
        throw new Error(`Failed to fetch expired downloads: ${fetchError.message}`);
      }

      if (!expiredDownloads || expiredDownloads.length === 0) {
        console.log('No expired downloads to clean up');
        return { count: 0, files: [] };
      }

      console.log(`Found ${expiredDownloads.length} expired downloads`);

      // Delete files from Storage
      const filePaths = expiredDownloads.map((d) => d.url).filter((url) => url && url.startsWith('exports/'));

      if (filePaths.length > 0) {
        const { error: storageError } = await supabase.storage.from('exports').remove(filePaths);

        if (storageError) {
          console.error('Error deleting files from storage:', storageError);
          // Continue even if storage deletion fails
        } else {
          console.log(`Deleted ${filePaths.length} files from storage`);
        }
      }

      // Delete download records from database
      const { error: deleteError } = await supabase.from('downloads').delete().lt('expires_at', now);

      if (deleteError) {
        console.error('Error deleting download records:', deleteError);
        throw new Error(`Failed to delete download records: ${deleteError.message}`);
      }

      console.log(`Deleted ${expiredDownloads.length} download records`);

      return {
        count: expiredDownloads.length,
        files: filePaths,
      };
    });

    // Step 2: Delete expired selections and their items
    const deletedSelections = await step.run('delete-expired-selections', async () => {
      const supabase = supabaseAdminClient;

      // Fetch expired selections to count them
      const { data: expiredSelections, error: fetchError } = await supabase
        .from('selections')
        .select('id')
        .lt('expires_at', now);

      if (fetchError) {
        console.error('Error fetching expired selections:', fetchError);
        throw new Error(`Failed to fetch expired selections: ${fetchError.message}`);
      }

      if (!expiredSelections || expiredSelections.length === 0) {
        console.log('No expired selections to clean up');
        return { count: 0 };
      }

      console.log(`Found ${expiredSelections.length} expired selections`);

      // Delete selection_items first (due to foreign key constraint)
      const selectionIds = expiredSelections.map((s) => s.id);
      const { error: itemsError } = await supabase.from('selection_items').delete().in('selection_id', selectionIds);

      if (itemsError) {
        console.error('Error deleting selection items:', itemsError);
        throw new Error(`Failed to delete selection items: ${itemsError.message}`);
      }

      // Delete selections
      const { error: deleteError } = await supabase.from('selections').delete().lt('expires_at', now);

      if (deleteError) {
        console.error('Error deleting selections:', deleteError);
        throw new Error(`Failed to delete selections: ${deleteError.message}`);
      }

      console.log(`Deleted ${expiredSelections.length} selections and their items`);

      return {
        count: expiredSelections.length,
      };
    });

    // Return summary
    return {
      timestamp: now,
      downloads: deletedDownloads,
      selections: deletedSelections,
    };
  }
);
