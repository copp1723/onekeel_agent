# AgentFlow API Documentation

This directory contains the OpenAPI specification for the AgentFlow API.

## Overview

The AgentFlow API provides endpoints for:

- Task management
- Workflow execution
- Job management
- Authentication
- Health monitoring

## Files

- `openapi.yaml`: Main OpenAPI specification file with core endpoints
- `openapi-workflows.yaml`: Workflow-related endpoints
- `openapi-jobs.yaml`: Job management endpoints
- `openapi-auth.yaml`: Authentication endpoints

## Using the API Documentation

### Viewing the Documentation

You can view the API documentation using any OpenAPI viewer, such as:

- [Swagger UI](https://swagger.io/tools/swagger-ui/)
- [Redoc](https://redocly.github.io/redoc/)
- [Stoplight Studio](https://stoplight.io/studio)

### Importing into Postman

1. Open Postman
2. Click on "Import" in the top left
3. Select "OpenAPI" and upload the `openapi.yaml` file
4. Postman will create a collection with all the endpoints

## Authentication

Most endpoints require authentication. The API uses cookie-based authentication with the `connect.sid` cookie.

To authenticate:

1. Visit `/api/auth/login` in your browser
2. Complete the authentication flow
3. The browser will receive the authentication cookie
4. Subsequent API requests will include the cookie automatically

## Common Response Codes

- `200 OK`: Request succeeded
- `201 Created`: Resource created successfully
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

## Examples

### Creating a Task

```bash
curl -X POST \
  http://localhost:5000/api/tasks \
  -H 'Content-Type: application/json' \
  -d '{"task": "Extract content from https://example.com"}'
```

### Getting a Workflow

```bash
curl -X GET \
  http://localhost:5000/api/workflows/123e4567-e89b-12d3-a456-426614174000
```

## Rate Limiting

The API implements rate limiting to prevent abuse. Clients should respect the following headers:

- `X-RateLimit-Limit`: Maximum number of requests allowed in a time window
- `X-RateLimit-Remaining`: Number of requests remaining in the current window
- `X-RateLimit-Reset`: Time when the current window resets (Unix timestamp)

## Support

For API support, contact support@agentflow.com or open an issue on the GitHub repository.
