import type { Json } from '@/libs/supabase/types';

interface FollowUpSourceSession {
  prompt: string;
  form_input: Json | null;
  input_snapshot: Json | null;
  created_at: string;
  completed_at: string;
  csv_url: string | null;
}

interface FollowUpSessionInsert {
  user_id: string;
  selection_id: string;
  prompt: string;
  status: 'completed';
  progress: 100;
  standard_question_id: '1';
  form_input: Json | null;
  input_snapshot: Json | null;
  created_at: string;
  completed_at: string;
  csv_url: string | null;
}

export function buildFollowUpSessionInsert(
  source: FollowUpSourceSession,
  userId: string,
  newSelectionId: string
): FollowUpSessionInsert {
  return {
    user_id: userId,
    selection_id: newSelectionId,
    prompt: source.prompt,
    status: 'completed',
    progress: 100,
    standard_question_id: '1',
    form_input: source.form_input,
    input_snapshot: source.input_snapshot,
    created_at: source.created_at,
    completed_at: source.completed_at,
    csv_url: source.csv_url ?? null,
  };
}
