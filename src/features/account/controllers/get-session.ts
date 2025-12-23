import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';

export async function getSession() {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.auth.getUser();

  if (error) {
    console.error(error);
    return null;
  }

  // Return in the same format as getSession() for backward compatibility
  // This maintains the session.user structure that calling code expects
  return {
    user: data.user,
  };
}
