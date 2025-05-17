-- Migration: Create insight_logs table
-- This table tracks AI insight generation attempts, including success/failure, duration, and prompt details

CREATE TABLE IF NOT EXISTS insight_logs (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    success BOOLEAN NOT NULL,
    duration_ms INTEGER,
    error TEXT,
    role VARCHAR(50),
    prompt_version VARCHAR(20),
    raw_response JSONB,
    raw_prompt TEXT,
    api_key_hint VARCHAR(10)  -- Store last 4 chars of API key for debugging
);

-- Create indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_insight_logs_created_at ON insight_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_insight_logs_success ON insight_logs(success);
