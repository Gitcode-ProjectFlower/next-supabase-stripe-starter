-- Tighten permissive RLS policies on QA and usage tables.
--
-- Background jobs (Inngest) and server helpers use the service-role client,
-- which bypasses RLS entirely, so they are unaffected.
-- API routes and the regeneration flow use the user-scoped server client and
-- keep working because the new policies allow owners to manage their own rows.
-- The qa_answers DELETE policy additionally fixes the failed-run regeneration
-- flow, whose cleanup delete was previously denied (and silently ignored).

-- qa_sessions UPDATE: owners only (was USING (true))
DROP POLICY IF EXISTS "Service role can update qa sessions" ON qa_sessions;
DROP POLICY IF EXISTS "Users can update own qa sessions" ON qa_sessions;
CREATE POLICY "Users can update own qa sessions"
  ON qa_sessions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- qa_answers INSERT: only into own sessions (was WITH CHECK (true))
DROP POLICY IF EXISTS "Service role can insert qa answers" ON qa_answers;
DROP POLICY IF EXISTS "Users can insert answers into own sessions" ON qa_answers;
CREATE POLICY "Users can insert answers into own sessions"
  ON qa_answers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM qa_sessions
      WHERE qa_sessions.id = qa_answers.session_id
      AND qa_sessions.user_id = auth.uid()
    )
  );

-- qa_answers DELETE: own sessions (failed-run regeneration cleanup)
DROP POLICY IF EXISTS "Users can delete answers of own sessions" ON qa_answers;
CREATE POLICY "Users can delete answers of own sessions"
  ON qa_answers FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM qa_sessions
      WHERE qa_sessions.id = qa_answers.session_id
      AND qa_sessions.user_id = auth.uid()
    )
  );

-- qa_standard_runs UPDATE: owners only (was USING (true))
DROP POLICY IF EXISTS "Service role can update standard runs" ON qa_standard_runs;
DROP POLICY IF EXISTS "Users can update own standard runs" ON qa_standard_runs;
CREATE POLICY "Users can update own standard runs"
  ON qa_standard_runs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- usage_log INSERT: own rows only (was WITH CHECK (true))
DROP POLICY IF EXISTS "Service role can insert usage" ON usage_log;
DROP POLICY IF EXISTS "Users can insert own usage" ON usage_log;
CREATE POLICY "Users can insert own usage"
  ON usage_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);
