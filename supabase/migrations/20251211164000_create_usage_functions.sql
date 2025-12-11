-- RPC functions for usage tracking and limit checking

-- Function: Get usage statistics for a user (rolling 30 days)
CREATE OR REPLACE FUNCTION get_usage_stats(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_downloads INTEGER;
  v_ai_calls INTEGER;
BEGIN
  -- Count downloads in last 30 days
  SELECT COALESCE(SUM(count), 0) INTO v_downloads
  FROM usage_log
  WHERE user_id = p_user_id
    AND action = 'record_download'
    AND created_at >= NOW() - INTERVAL '30 days';
  
  -- Count AI calls in last 30 days
  SELECT COALESCE(SUM(count), 0) INTO v_ai_calls
  FROM usage_log
  WHERE user_id = p_user_id
    AND action = 'ai_question'
    AND created_at >= NOW() - INTERVAL '30 days';
  
  RETURN json_build_object(
    'downloads', v_downloads,
    'ai_calls', v_ai_calls,
    'period_start', NOW() - INTERVAL '30 days',
    'period_end', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if user can perform action without exceeding limit
CREATE OR REPLACE FUNCTION check_usage_limit(
  p_user_id UUID,
  p_action TEXT,
  p_count INTEGER,
  p_limit INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_usage INTEGER;
BEGIN
  -- Get current usage for this action
  SELECT COALESCE(SUM(count), 0) INTO v_current_usage
  FROM usage_log
  WHERE user_id = p_user_id
    AND action = p_action
    AND created_at >= NOW() - INTERVAL '30 days';
  
  -- Check if adding new count would exceed limit
  RETURN (v_current_usage + p_count) <= p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments
COMMENT ON FUNCTION get_usage_stats IS 'Returns download and AI call counts for the last 30 days';
COMMENT ON FUNCTION check_usage_limit IS 'Checks if user can perform action without exceeding their plan limit';
