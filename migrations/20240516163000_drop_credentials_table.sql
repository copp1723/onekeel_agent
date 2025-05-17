-- Drop foreign key constraints first
ALTER TABLE user_credentials 
  DROP CONSTRAINT IF EXISTS user_credentials_credential_id_fkey;

-- Drop the credentials table
DROP TABLE IF EXISTS credentials CASCADE;

-- Drop the user_credentials table if it exists
DROP TABLE IF EXISTS user_credentials CASCADE;
