# AgentFlow API Documentation Guide

## Overview

The AgentFlow API provides a comprehensive set of endpoints for managing tasks, workflows, jobs, schedules, and health monitoring. This guide provides detailed information about each endpoint, including request/response formats, authentication requirements, and examples.

## Base URL

All API endpoints are relative to the base URL of your AgentFlow instance:

```
http://localhost:5000/api
```

## Authentication

Most endpoints require authentication. The API uses cookie-based authentication with the `connect.sid` cookie.

To authenticate:

1. Visit `/api/auth/login` in your browser
2. Complete the authentication flow
3. The browser will receive the authentication cookie
4. Subsequent API requests will include the cookie automatically

For testing purposes, you can use tools like Postman or curl with the `--cookie` flag to include the authentication cookie.

## Common Response Codes

- `200 OK`: Request succeeded
- `201 Created`: Resource created successfully
- `204 No Content`: Request succeeded, no content to return
- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

## Error Responses

All error responses follow this format:

```json
{
  "error": "Error type",
  "message": "Detailed error message"
}
```

## API Endpoints

### Authentication

#### GET /auth/login

Redirects to the authentication provider for login.

**Response:**
- `302 Found`: Redirects to authentication provider

#### GET /auth/callback

Callback endpoint for the authentication provider.

**Parameters:**
- `code` (query, required): Authorization code
- `state` (query, required): State parameter for security

**Response:**
- `302 Found`: Redirects to application after successful authentication
- `401 Unauthorized`: Authentication failed

#### GET /auth/logout

Logs out the current user.

**Response:**
- `302 Found`: Redirects to login page after logout

#### GET /auth/user

Gets information about the currently authenticated user.

**Response:**
- `200 OK`: User information
  ```json
  {
    "id": "user123",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "profileImageUrl": "https://example.com/profile.jpg"
  }
  ```
- `401 Unauthorized`: User ID not found
- `404 Not Found`: User not found
- `500 Internal Server Error`: Server error

### Tasks

#### GET /tasks

Gets a list of all tasks.

**Response:**
- `200 OK`: List of tasks
  ```json
  [
    {
      "id": "task123",
      "taskType": "webCrawl",
      "taskText": "Crawl https://example.com",
      "status": "completed",
      "userId": "user123",
      "createdAt": "2023-01-01T12:00:00Z",
      "updatedAt": "2023-01-01T12:05:00Z"
    }
  ]
  ```
- `500 Internal Server Error`: Server error

#### POST /tasks

Creates a new task.

**Request Body:**
```json
{
  "task": "Crawl https://example.com and extract the title, url, and score of the top 5 posts"
}
```

**Response:**
- `201 Created`: Task created successfully
  ```json
  {
    "id": "task123",
    "jobId": "job456",
    "message": "Task submitted and enqueued successfully"
  }
  ```
- `400 Bad Request`: Invalid request
- `500 Internal Server Error`: Server error

#### GET /tasks/{taskId}

Gets details of a specific task.

**Parameters:**
- `taskId` (path, required): Task ID

**Response:**
- `200 OK`: Task details
  ```json
  {
    "id": "task123",
    "taskType": "webCrawl",
    "taskText": "Crawl https://example.com",
    "taskData": {
      "url": "https://example.com",
      "extractFields": ["title", "url", "score"],
      "limit": 5
    },
    "status": "completed",
    "userId": "user123",
    "createdAt": "2023-01-01T12:00:00Z",
    "updatedAt": "2023-01-01T12:05:00Z"
  }
  ```
- `404 Not Found`: Task not found
- `500 Internal Server Error`: Server error

### Workflows

#### GET /workflows

Gets a list of all workflows or filters by status.

**Parameters:**
- `status` (query, optional): Filter by status (pending, running, completed, failed, paused)

**Response:**
- `200 OK`: List of workflows
  ```json
  [
    {
      "id": "workflow123",
      "name": "Data Processing Workflow",
      "description": "Process data from multiple sources",
      "status": "completed",
      "userId": "user123",
      "steps": [
        {
          "id": "step1",
          "type": "dataProcessing",
          "name": "Extract Data",
          "status": "completed"
        }
      ],
      "createdAt": "2023-01-01T12:00:00Z",
      "updatedAt": "2023-01-01T12:30:00Z"
    }
  ]
  ```
- `500 Internal Server Error`: Server error

#### GET /workflows/{id}

Gets details of a specific workflow.

**Parameters:**
- `id` (path, required): Workflow ID

**Response:**
- `200 OK`: Workflow details
  ```json
  {
    "id": "workflow123",
    "name": "Data Processing Workflow",
    "description": "Process data from multiple sources",
    "status": "completed",
    "userId": "user123",
    "steps": [
      {
        "id": "step1",
        "type": "dataProcessing",
        "name": "Extract Data",
        "config": {
          "source": "https://example.com",
          "format": "json"
        },
        "status": "completed"
      }
    ],
    "createdAt": "2023-01-01T12:00:00Z",
    "updatedAt": "2023-01-01T12:30:00Z"
  }
  ```
- `403 Forbidden`: Access denied
- `404 Not Found`: Workflow not found
- `500 Internal Server Error`: Server error

#### POST /workflows/{id}/reset

Resets a workflow to pending status.

**Parameters:**
- `id` (path, required): Workflow ID

**Response:**
- `200 OK`: Workflow reset successfully
  ```json
  {
    "id": "workflow123",
    "status": "pending",
    "message": "Workflow reset successfully"
  }
  ```
- `403 Forbidden`: Access denied
- `404 Not Found`: Workflow not found
- `500 Internal Server Error`: Server error

#### POST /workflows/{id}/notifications

Configures email notifications for a workflow.

**Parameters:**
- `id` (path, required): Workflow ID

**Request Body:**
```json
{
  "emails": [
    "user@example.com",
    "admin@example.com"
  ]
}
```

**Response:**
- `200 OK`: Notifications configured successfully
  ```json
  {
    "id": "workflow123",
    "notificationEmails": [
      "user@example.com",
      "admin@example.com"
    ],
    "message": "Notifications configured successfully"
  }
  ```
- `400 Bad Request`: Invalid request
- `403 Forbidden`: Access denied
- `404 Not Found`: Workflow not found
- `500 Internal Server Error`: Server error

### Credentials

#### GET /credentials

Gets a list of all credentials for the authenticated user.

**Parameters:**
- `platform` (query, optional): Filter credentials by platform

**Response:**
- `200 OK`: List of credentials
  ```json
  [
    {
      "id": "cred123",
      "platform": "salesforce",
      "label": "Sales Account",
      "created": "2023-01-01T12:00:00Z",
      "updated": "2023-01-01T12:05:00Z",
      "hasRefreshToken": true,
      "data": {
        "username": "user@example.com",
        "instanceUrl": "https://example.salesforce.com"
      }
    }
  ]
  ```
- `401 Unauthorized`: User ID not found
- `500 Internal Server Error`: Server error

#### POST /credentials

Creates a new credential.

**Request Body:**
```json
{
  "platform": "salesforce",
  "label": "Sales Account",
  "data": {
    "username": "user@example.com",
    "accessToken": "token123",
    "instanceUrl": "https://example.salesforce.com"
  },
  "refreshToken": "refresh123",
  "refreshTokenExpiry": "2023-02-01T12:00:00Z"
}
```

**Response:**
- `201 Created`: Credential created successfully
  ```json
  {
    "id": "cred123",
    "platform": "salesforce",
    "label": "Sales Account",
    "created": "2023-01-01T12:00:00Z"
  }
  ```
- `400 Bad Request`: Invalid request
- `401 Unauthorized`: User ID not found
- `500 Internal Server Error`: Server error

#### GET /credentials/{id}

Gets details of a specific credential.

**Parameters:**
- `id` (path, required): Credential ID

**Response:**
- `200 OK`: Credential details
  ```json
  {
    "id": "cred123",
    "platform": "salesforce",
    "label": "Sales Account",
    "created": "2023-01-01T12:00:00Z",
    "updated": "2023-01-01T12:05:00Z",
    "hasRefreshToken": true,
    "data": {
      "username": "user@example.com",
      "instanceUrl": "https://example.salesforce.com"
    }
  }
  ```
- `401 Unauthorized`: User ID not found
- `404 Not Found`: Credential not found
- `500 Internal Server Error`: Server error

#### PUT /credentials/{id}

Updates an existing credential.

**Parameters:**
- `id` (path, required): Credential ID

**Request Body:**
```json
{
  "label": "Updated Sales Account",
  "data": {
    "username": "user@example.com",
    "accessToken": "newtoken123",
    "instanceUrl": "https://example.salesforce.com"
  },
  "refreshToken": "newrefresh123",
  "refreshTokenExpiry": "2023-03-01T12:00:00Z",
  "active": true
}
```

**Response:**
- `200 OK`: Credential updated successfully
  ```json
  {
    "id": "cred123",
    "platform": "salesforce",
    "label": "Updated Sales Account",
    "updated": "2023-01-02T12:00:00Z"
  }
  ```
- `401 Unauthorized`: User ID not found
- `404 Not Found`: Credential not found
- `500 Internal Server Error`: Server error

#### DELETE /credentials/{id}

Deletes a credential (soft delete).

**Parameters:**
- `id` (path, required): Credential ID

**Response:**
- `204 No Content`: Credential deleted successfully
- `401 Unauthorized`: User ID not found
- `404 Not Found`: Credential not found
- `500 Internal Server Error`: Server error

### Jobs

#### GET /jobs

Gets a list of all jobs or filters by status.

**Parameters:**
- `status` (query, optional): Filter by status (waiting, active, completed, failed, delayed)

**Response:**
- `200 OK`: List of jobs
  ```json
  [
    {
      "id": "job123",
      "taskId": "task456",
      "status": "completed",
      "progress": 100,
      "result": {
        "data": [
          {
            "title": "Example Title",
            "url": "https://example.com/article",
            "score": 42
          }
        ]
      },
      "createdAt": "2023-01-01T12:00:00Z",
      "updatedAt": "2023-01-01T12:05:00Z"
    }
  ]
  ```
- `500 Internal Server Error`: Server error

#### GET /jobs/{id}

Gets details of a specific job.

**Parameters:**
- `id` (path, required): Job ID

**Response:**
- `200 OK`: Job details with associated task
  ```json
  {
    "job": {
      "id": "job123",
      "taskId": "task456",
      "status": "completed",
      "progress": 100,
      "result": {
        "data": [
          {
            "title": "Example Title",
            "url": "https://example.com/article",
            "score": 42
          }
        ]
      },
      "createdAt": "2023-01-01T12:00:00Z",
      "updatedAt": "2023-01-01T12:05:00Z"
    },
    "task": {
      "id": "task456",
      "taskType": "webCrawl",
      "taskText": "Crawl https://example.com",
      "status": "completed"
    }
  }
  ```
- `404 Not Found`: Job not found
- `500 Internal Server Error`: Server error

#### POST /jobs/{id}/retry

Retries a failed job.

**Parameters:**
- `id` (path, required): Job ID

**Response:**
- `200 OK`: Job retry initiated
  ```json
  {
    "id": "job123",
    "message": "Job retry initiated"
  }
  ```
- `404 Not Found`: Job not found
- `500 Internal Server Error`: Server error

## Testing the API

You can test the API using tools like cURL, Postman, or any HTTP client.

### Example: Creating a Task

```bash
curl -X POST \
  http://localhost:5000/api/tasks \
  -H 'Content-Type: application/json' \
  -H 'Cookie: connect.sid=your_session_cookie' \
  -d '{"task": "Crawl https://example.com and extract the title, url, and score of the top 5 posts"}'
```

### Example: Getting Workflows

```bash
curl -X GET \
  http://localhost:5000/api/workflows \
  -H 'Cookie: connect.sid=your_session_cookie'
```

## Rate Limiting

The API implements rate limiting to prevent abuse. Clients should respect the following headers:

- `X-RateLimit-Limit`: Maximum number of requests allowed in a time window
- `X-RateLimit-Remaining`: Number of requests remaining in the current window
- `X-RateLimit-Reset`: Time when the current window resets (Unix timestamp)

## Webhooks

AgentFlow supports webhooks for event notifications. You can configure webhooks to receive notifications when:

- Tasks are completed
- Workflows change status
- Jobs fail or complete

Webhook configuration is available through the admin interface.