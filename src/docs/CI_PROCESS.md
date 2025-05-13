# Continuous Integration (CI) Process

## Overview

This document describes the Continuous Integration (CI) process for the AgentFlow project. The CI pipeline is implemented using GitHub Actions and automatically runs whenever code is pushed to the main branch or a pull request is created.

## CI Pipeline Stages

The CI pipeline consists of the following stages:

1. **Lint**: Checks code formatting and style
2. **Test**: Runs unit and integration tests
3. **Build**: Builds the application

### Lint Stage

The lint stage performs the following checks:

- **ESLint**: Checks code formatting and style using ESLint
- **TypeScript Compilation**: Verifies that the TypeScript code compiles without errors

### Test Stage

The test stage runs the following tests:

- **Unit Tests**: Tests individual components in isolation
- **Integration Tests**: Tests interactions between components

The test stage requires a PostgreSQL database, which is automatically set up as a service container.

### Build Stage

The build stage performs the following tasks:

- **Build Application**: Compiles TypeScript code to JavaScript
- **Upload Artifacts**: Uploads the build artifacts for potential deployment

## CI Configuration

The CI pipeline is configured in the `.github/workflows/ci.yml` file. This file defines the workflow, jobs, and steps that make up the CI process.

## Running CI Locally

You can run the same checks that the CI pipeline performs locally:

```bash
# Check code formatting
npx eslint . --ext .js,.jsx,.ts,.tsx

# Check TypeScript compilation
npm run check-types

# Run unit tests
npm run test:unit

# Run integration tests
npm run test:integration

# Build the application
npm run build
```

## CI Environment Variables

The CI pipeline uses the following environment variables:

- `DATABASE_URL`: Connection string for the PostgreSQL database
- `NODE_ENV`: Environment (set to "test" during CI)

## Test Coverage

The CI pipeline collects test coverage information and uploads it as an artifact. You can view the coverage report by downloading the artifact from the GitHub Actions workflow run.

## Troubleshooting CI Failures

If the CI pipeline fails, you can troubleshoot the issue by:

1. Checking the GitHub Actions workflow run logs
2. Running the failing checks locally
3. Fixing the issues and pushing the changes

Common issues include:

- **Lint Errors**: Code formatting or style issues
- **TypeScript Errors**: Type errors or missing type definitions
- **Test Failures**: Failed unit or integration tests
- **Build Errors**: Compilation errors

## Adding New Tests to CI

When adding new tests to the codebase, ensure they are placed in the appropriate directories:

- Unit tests: `src/**/__tests__/*.test.ts`
- Integration tests: `src/__tests__/integration/*.spec.ts`

The CI pipeline will automatically discover and run these tests.

## CI Best Practices

1. **Keep the CI pipeline fast**: Optimize tests and build processes to run quickly
2. **Fix CI failures immediately**: Don't let failures accumulate
3. **Write meaningful tests**: Tests should verify important functionality
4. **Maintain high test coverage**: Aim for at least 70% code coverage
5. **Run CI locally before pushing**: Avoid pushing code that will fail CI

## Future Enhancements

Planned enhancements to the CI process include:

1. **Automated Deployments**: Deploy to staging or production environments
2. **Performance Testing**: Measure and track application performance
3. **Security Scanning**: Identify security vulnerabilities
4. **End-to-End Testing**: Test the entire application stack
