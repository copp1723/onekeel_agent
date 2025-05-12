# Insight Engine Testing Guide

This guide provides instructions for testing the Insight Engine, including stability features, quality scoring, and integration with various data sources.

## Prerequisites

Before running tests, ensure you have:

1. Node.js v20+ installed
2. OpenAI API key set in your environment:
   ```
   export OPENAI_API_KEY=sk-...
   ```
3. (Optional) Access to CRM data sources (email or direct API access)

## Basic Stability Test

This test verifies the core stability features without requiring real CRM data:

```bash
node test-insight-engine-stability.cjs
```

The test uses sample data to:
- Test prompt version tracking
- Verify output storage structure
- Check logging functionality
- Test optional quality scoring

**Expected Output:**

```
✓ Insight generation successful
✓ Prompt version v1.0.0 recorded in metadata
✓ Results stored in /results/sample/YYYY-MM-DD/
✓ Log entry created in logs/insight_runs.log
```

## End-to-End Testing with Real Data

For a full test with your own CRM data:

```bash
# Replace with your actual file path
node test-crm-fetch-and-analyze-with-logging.js VinSolutions 12345 ./path/to/sample.csv
```

This will:
1. Process your CRM data
2. Generate automotive insights
3. Store results with full metadata
4. Perform optional quality scoring

## Batch Testing with Multiple Files

To test against a batch of CSV files:

1. Create a directory for your test data:
   ```bash
   mkdir -p test-data
   ```

2. Copy your CSV files into this directory:
   ```bash
   cp ~/Downloads/*.csv test-data/
   ```

3. Run the smoke test script:
   ```bash
   node scripts/run-smoke-tests.js
   ```

## Analyzing Results

After running tests, analyze the results with:

```bash
node scripts/analyze-results.js
```

This will show:
- Total insights generated 
- Success/failure rates
- Average generation time
- Prompt version distribution
- (If enabled) Quality score averages

## Results Structure

All test results are stored in a structured directory hierarchy:

```
/results/
  ├── VinSolutions/           # Platform name
  │   └── 2025-05-12/         # Date of generation (YYYY-MM-DD)
  │       ├── insight_1.json  # Full results with metadata
  │       └── insight_2.json
  ├── VAUTO/
  │   └── 2025-05-12/
  │       └── ...
  └── sample/                 # For tests with sample data
      └── 2025-05-12/
          └── ...
```

Each result JSON file contains:
- Generated insights
- Prompt used (with version)
- Execution metadata (timing, status)
- Input data summary
- (If enabled) Quality scores

## Logging

All insight generation runs are logged to `logs/insight_runs.log`. Each log entry contains:
- Timestamp
- Platform and data source
- Status (success/error)
- Duration
- Prompt version

## CI/CD Integration

The GitHub Actions workflow in `.github/workflows/test-insight-engine.yml` automatically:
- Runs on changes to related code
- Executes the basic stability test
- Archives logs and results for review

## Troubleshooting

If tests fail:

1. Check OPENAI_API_KEY is set and valid
2. Ensure the `logs` and `results` directories are writable
3. Verify your CSV files match the expected format
4. Check API rate limits if running many tests in sequence

For specific error messages, consult `logs/insight_runs.log`

## Next Steps

After verifying the stability features, consider:

1. A/B testing different prompt versions
2. Adding dedicated test cases for each CRM platform
3. Integrating with automated notification systems
4. Setting up scheduled insight generation