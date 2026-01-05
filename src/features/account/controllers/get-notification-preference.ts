import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';

/**
 * Get user's email notification preference from the database
 * @param userId - User ID
 * @returns Boolean indicating if email notifications are enabled (defaults to false)
 */
export async function getNotificationPreference(userId: string): Promise<boolean> {
  try {
    const supabase = await createSupabaseServerClient();

    // Select the email_notifications_enabled field
    const { data, error } = await supabase
      .from('users')
      .select('email_notifications_enabled')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('[getNotificationPreference] Error:', error);
      return false; // Default to false on error
    }

    // Return the preference (default to false if not set)
    return (data as { email_notifications_enabled?: boolean } | null)?.email_notifications_enabled ?? false;
  } catch (error) {
    console.error('[getNotificationPreference] Unexpected error:', error);
    return false;
  }
}
