# Credential Management Migration Guide

## Overview

The system has been migrated from a browser automation approach to an email-only ingestion approach. This means that the credential management UI and API endpoints are no longer required for new users. However, they are kept for backward compatibility with existing users.

## Changes Made

### UI Changes

1. Removed the credential management components from the home page
2. Updated the TaskForm component to use predefined platforms instead of getting them from credentials
3. Added deprecation notices to the CredentialForm and CredentialsList components

### API Changes

1. Added deprecation notices to all credential management API endpoints
2. Added deprecation headers to all credential management API responses
3. Kept the API endpoints functional for existing users

## Migration Path for Existing Users

Existing users can continue to use the system as before. Their credentials will still work, and they can still manage them through the API. However, they are encouraged to migrate to the new email-only ingestion approach.

## New User Experience

New users will not see the credential management UI. Instead, they will only see the TaskForm component, which allows them to request analyses based on predefined platforms.

## Technical Details

### Deprecated Components

- `CredentialForm.tsx`
- `CredentialsList.tsx`

### Deprecated API Endpoints

- `GET /api/credentials`
- `GET /api/credentials/:id`
- `POST /api/credentials`
- `PUT /api/credentials/:id`
- `DELETE /api/credentials/:id`

### Predefined Platforms

The system now uses predefined platforms instead of getting them from credentials. These platforms are:

- VinSolutions
- VAUTO
- CDK
- Reynolds

## Future Work

In a future release, the credential management UI and API endpoints will be completely removed. Users will be notified in advance of this change.
