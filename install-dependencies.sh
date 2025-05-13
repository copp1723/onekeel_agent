#!/bin/bash

# Script to install missing dependencies for AgentFlow

echo "Installing missing TypeScript dependencies..."

# Install TypeScript type definitions
npm install --save-dev \
  @types/express \
  @types/node \
  @types/jest \
  @types/uuid \
  @types/crypto-js \
  @types/nodemailer \
  @types/connect-pg-simple \
  @types/express-session \
  @types/passport \
  @types/imap-simple \
  @types/mailparser \
  @types/memoizee

# Install missing runtime dependencies
npm install \
  drizzle-orm \
  drizzle-orm/postgres-js \
  drizzle-orm/pg-core \
  openai \
  express \
  dotenv \
  uuid \
  crypto-js \
  postgres \
  node-cron \
  imap-simple \
  mailparser \
  nodemailer \
  @sendgrid/mail \
  ioredis \
  bullmq \
  axios \
  playwright-core \
  @eko-ai/eko \
  zod \
  express-session \
  passport \
  connect-pg-simple \
  memoizee \
  openid-client

echo "Installing frontend dependencies..."
cd frontend && npm install

echo "All dependencies installed successfully!"
echo "Now run 'npm run build' to build the project."
