#!/bin/bash

# Test script for email notification API endpoints
# Usage: ./test-notifications.sh <recipient-email>

# Check if recipient email is provided
if [ -z "$1" ]; then
  echo "Usage: ./test-notifications.sh <recipient-email>"
  exit 1
fi

EMAIL="$1"
BASE_URL="http://localhost:5001"

echo "=== Email Notification API Test ==="
echo "Testing with recipient: $EMAIL"
echo

# Create a test workflow for sending emails
echo "Creating test workflow..."
WORKFLOW_ID=$(curl -s -X POST "$BASE_URL/submit-task" \
  -H "Content-Type: application/json" \
  -d "{\"task\": \"Test email notification system\"}" \
  | jq -r '.workflowId')

if [ -z "$WORKFLOW_ID" ] || [ "$WORKFLOW_ID" == "null" ]; then
  echo "Failed to create workflow"
  exit 1
fi

echo "Created workflow: $WORKFLOW_ID"
echo

# Send a test email
echo "Sending test email to $EMAIL..."
curl -s -X POST "$BASE_URL/test-email" \
  -H "Content-Type: application/json" \
  -d "{\"recipient\": \"$EMAIL\"}" \
  | jq

echo

# Configure email notifications
echo "Configuring email notifications..."
NOTIFICATION_ID=$(curl -s -X POST "$BASE_URL/api/emails/notifications" \
  -H "Content-Type: application/json" \
  -d "{
    \"workflowType\": \"task\",
    \"platform\": \"test\",
    \"recipients\": [\"$EMAIL\"],
    \"enabled\": true,
    \"sendOnCompletion\": true,
    \"sendOnFailure\": true,
    \"includeInsights\": true
  }" \
  | jq -r '.data.id')

if [ -z "$NOTIFICATION_ID" ] || [ "$NOTIFICATION_ID" == "null" ]; then
  echo "Failed to configure notification"
else
  echo "Configured notifications with ID: $NOTIFICATION_ID"
fi

echo

# Get email notification settings
echo "Getting notification settings..."
curl -s "$BASE_URL/api/emails/notifications" | jq
echo

# Get email logs
echo "Getting email logs for workflow $WORKFLOW_ID..."
curl -s "$BASE_URL/api/emails/logs/$WORKFLOW_ID" | jq
echo

# Clean up at the end
echo "Test completed."