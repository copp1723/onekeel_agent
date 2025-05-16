# Testing Best Practices for Error Handling & Configuration Validation

## 1. Unit Testing Error Handling
- Write tests for all custom error classes and error branches.
- Simulate both expected and unexpected errors.
- Assert that error messages and types are correct.

## 2. Configuration Validation
- Test all configuration validation functions (e.g., env var checks, cron validation) with valid and invalid inputs.
- Include edge cases (empty, missing, malformed values).

## 3. Integration Testing
- Simulate real-world scenarios where configuration or runtime errors may occur (e.g., DB connection failure, invalid config file).
- Assert that the system logs errors and degrades gracefully.

## 4. End-to-End Testing for Error Boundaries
- Trigger critical error scenarios through the API or UI.
- Verify that error boundaries catch and report errors without crashing the app.
- Check that user-facing error messages are clear and non-technical.

## 5. Coverage Goals
- Aim for 90%+ coverage on all new error handling and config validation code.
- Use coverage tools (nyc, c8, jest --coverage) to identify gaps.

## 6. General Tips
- Always clean up test data, even on error (use try/catch/finally).
- Prefer explicit assertions for error cases.
- Document any known limitations or untestable branches.
