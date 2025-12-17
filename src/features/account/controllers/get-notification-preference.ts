import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';

/**
 * Get user's email notification preference from the database
 * @param userId - User ID
 * @returns Boolean indicating if email notifications are enabled (defaults to false)
 */
export async function getNotificationPreference(userId: string): Promise<boolean> {
  try {
    const supabase = await createSupabaseServerClient();

    // TypeScript cast needed until migration is run and types are regenerated
    const { data, error } = await supabase.from('users').select('id').eq('id', userId).single();

    if (error) {
      console.error('[getNotificationPreference] Error:', error);
      return false; // Default to false on error
    }

    return ((data as any)?.email_notifications_enabled as boolean) ?? false;
  } catch (error) {
    console.error('[getNotificationPreference] Unexpected error:', error);
    return false;
  }
}
