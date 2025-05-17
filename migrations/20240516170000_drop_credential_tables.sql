-- Migration to remove credential-related tables
-- This migration should be run after ensuring all credential data has been migrated or is no longer needed

-- Drop foreign key constraints first to avoid dependency issues
ALTER TABLE user_credentials 
  DROP CONSTRAINT IF EXISTS user_credentials_credential_id_fkey;

-- Drop the credentials table
DROP TABLE IF EXISTS credentials CASCADE;

-- Drop the user_credentials table
DROP TABLE IF EXISTS user_credentials CASCADE;

-- Clean up any remaining references in other tables
-- Note: Adjust these statements based on your actual schema
UPDATE workflows 
SET config = jsonb_set(config, '{steps}', 
  (SELECT jsonb_agg(step) 
   FROM jsonb_array_elements(workflows.config->'steps') step 
   WHERE step->>'type' != 'credential_retrieval'
  )
)
WHERE config->'steps' @> '[{"type": "credential_retrieval"}]';

-- Update audit logs to remove credential-related actions
UPDATE audit_logs 
SET action = 'removed_credential_reference'
WHERE action IN ('credential_create', 'credential_update', 'credential_delete');

-- Remove any scheduled jobs related to credential refresh
DELETE FROM scheduled_jobs 
WHERE job_type IN ('credential_refresh', 'credential_validation');

-- Clean up any API keys that were used for credential access
UPDATE api_keys 
SET description = description || ' (legacy credential access)',
    expires_at = LEAST(expires_at, NOW() + INTERVAL '1 day')
WHERE description LIKE '%credential%' 
   OR name LIKE '%credential%';

-- Vacuum to reclaim space (run during maintenance window)
-- VACUUM FULL ANALYZE credentials, user_credentials;
