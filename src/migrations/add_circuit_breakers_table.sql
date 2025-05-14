-- Migration to add circuit breakers table for tracking circuit breaker state

-- Create circuit_breakers table if it doesn't exist
CREATE TABLE IF NOT EXISTS circuit_breakers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  state VARCHAR(20) NOT NULL DEFAULT 'CLOSED',
  failures INTEGER NOT NULL DEFAULT 0,
  successes INTEGER NOT NULL DEFAULT 0,
  last_failure TIMESTAMP WITH TIME ZONE,
  last_success TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on name for faster lookups
CREATE INDEX IF NOT EXISTS idx_circuit_breakers_name ON circuit_breakers(name);

-- Add comment to table
COMMENT ON TABLE circuit_breakers IS 'Tracks circuit breaker state for resilient service calls';
