# Insight Engine Stability & Quality Upgrade Testing Guide

This document outlines the testing process for the Insight Engine Stability & Quality Upgrade implemented in Ticket #9.

## Features Added

The upgrade adds the following features to the Insight Engine:

1. **Prompt Version Tracking**: All LLM prompts now include version information (e.g., `v1.0.0`) following semver conventions.
2. **Insight Run Metadata Logging**: Each insight generation run logs detailed metadata including prompt version, execution time, and output summaries.
3. **Output Snapshotting**: Each generated insight is saved to a structured directory for historical analysis and comparison.
4. **LLM Quality Scoring**: Optional quality assessment of generated insights using an LLM-based evaluation.

## Testing Checklist

Before deploying the upgrade to production, complete the following tests:

### 1. CI Integration Tests

- [ ] Run TypeScript compilation check: `npx tsc --noEmit`
- [ ] Execute the end-to-end test script: `node test-insight-engine-stability.cjs`
- [ ] Verify test output directories are created in CI workspace

### 2. Smoke Tests with Real Data

- [ ] Run the enhanced analysis script with sample CSV:
  ```
  node test-crm-fetch-and-analyze-with-logging.js VinSolutions 12345 ./path/to/sample.csv
  ```

- [ ] Verify the following are created:
  - `/results/{platform}/{date}/insight_*.json` files
  - `/logs/insight_runs.log` entries with correct metadata

### 3. Quality Score Validation

- [ ] Examine AI-scored feedback on generated insights
- [ ] Compare scores across different prompt versions to track improvements
- [ ] Use the optional quality scoring feature:
  ```javascript
  import { scoreInsightQuality } from './dist/agents/insightScorer.js';
  const qualityScore = await scoreInsightQuality(insights);
  console.log(`Quality Score: ${qualityScore.score}/10`);
  ```

### 4. Error Handling Tests

- [ ] Test with malformed CSV data to verify proper error logging
- [ ] Check error cases in hybrid ingestion flow (email + browser fallback)
- [ ] Confirm error details are saved to results directory with error status

### 5. Performance Testing

- [ ] Track insight generation duration across multiple runs
- [ ] Analyze prompt version impact on generation time
- [ ] Verify logging overhead is minimal (< 5% of total operation time)

## Integration Points

The upgrade affects the following components:

- **Prompt System**: Version tracking added to all prompt definitions
- **Insight Generator**: Enhanced with logging, output storage, and error handling
- **Testing Scripts**: Updated to verify stability features

## Expected Results

After implementation, the system should:

1. Maintain detailed logs of all insight generation runs
2. Create structured snapshot directories with all generated insights
3. Include version information with all prompt invocations
4. Properly handle and log errors during generation
5. Score insight quality for ongoing improvement

## Troubleshooting

If any tests fail, check the following:

- **File Access**: Ensure the application has write permissions to `/logs` and `/results` directories
- **Environment Variables**: Verify `OPENAI_API_KEY` is properly set
- **Dependencies**: Check TypeScript compilation status for any type errors
- **ESM Compatibility**: Ensure imports use proper file extensions (`.js`) for ESM compatibility

## Post-Deployment Monitoring

After deploying to production:

1. Monitor insight generation duration for any performance regressions
2. Check log growth over time for potential disk space issues 
3. Track quality scores to identify areas for prompt improvement

## Stakeholder Demo Guidance

When demonstrating to stakeholders, focus on:

1. The historical insights archive in the `/results` directory
2. Insight quality scores as a measure of system performance
3. Version tracking for prompt improvements over time