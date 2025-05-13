# Multi-Vendor Email Ingestion System

This document describes the Multi-Vendor Email Ingestion System, which enables ingestion of CRM reports from different vendors through email, with intelligent processing and role-based insight distribution.

## Overview

The system provides a comprehensive solution for automating the ingestion, processing, and distribution of CRM reports from multiple automotive dealership vendors. It combines email-based ingestion with powerful insight generation and personalized distribution capabilities.

![Architecture Overview](https://mermaid.ink/img/pako:eNp1kk9PwzAMxb9KlBOIzYd2G0hcEGJwQ0icUOWm7iJI6xDHGUPrdzfp2g3Q5pT41-e_PNszdDYgFHARmuxkKkYDhzQ61ZuYCHzCgLbOTMRl5lWCaGGt1_AWdMKWVJyp5BX5VsAEjE5R2Q3a6NF3nQYJM2MltrfwhWAONf52bFE2JxY1RlzqLCJbK8pLTmmAjVw54EEjWFXVvgBbI8rqKm3vBcvydZnOHPsC3KiInYGS2GlDrF7F1TU8nZ8P4aRKmxC-M_gkZlw_Mjfi93HB6UJBGnCXMzn6cGI7FPx81g7A0SiN1eFEg5y1tRVXaJQ1ej9nj33UHo1ytvePbg__ldODZ9jVoeBZEtGMrOSWnZjNP9ePcloyWzEE3R6TwYuC1_RtSNlecqXI4lSIDNO1NFVRVhftSPTotUbF7iiFwi_V65Nw?type=png)

## Key Features

1. **Multi-Vendor Support**: Processes reports from different CRM vendors including:
   - VinSolutions (CRM)
   - VAUTO (Inventory Management)
   - DealerTrack (F&I)

2. **Email Ingestion**: 
   - Monitors dedicated mailboxes for vendor reports
   - Identifies reports using vendor-specific patterns
   - Extracts attachments for processing

3. **Flexible Format Support**:
   - CSV parsing
   - Excel/XLSX parsing with multi-sheet support
   - PDF extraction capabilities

4. **Enhanced Insight Generation**:
   - Business impact scoring
   - Quality assessment
   - Multi-dimensional analysis
   - Version tracking for prompts
   - Comprehensive metadata

5. **Role-Based Distribution**:
   - Intelligent routing to appropriate stakeholders
   - Personalized content based on role
   - Scheduled delivery options
   - Email delivery tracking

6. **Schedulable Operations**:
   - Daily/weekly/monthly processing
   - Automatic distribution to stakeholders
   - Configurable timing options

## System Components

### 1. Vendor Configuration

Each vendor is defined in `configs/multi-vendor.json` with specific handling rules:

```json
{
  "VinSolutions": {
    "emailPatterns": {
      "fromAddresses": ["reports@vinsolutions.com"],
      "subjectPatterns": ["Daily Report"],
      "attachmentTypes": ["csv", "xlsx"]
    },
    "extractorConfig": {
      "type": "csv",
      "dateColumn": "Date",
      "keyColumns": ["Customer", "Vehicle"]
    }
  }
}
```

### 2. Email Processing Engine

The `multiVendorEmailIngestion.js` service monitors emails and processes them according to vendor configurations:

```javascript
// Check emails from all vendors
const results = await checkEmailsFromAllVendors();

// Process each vendor's emails
for (const vendor of vendors) {
  const vendorConfig = getVendorConfig(vendor);
  const emails = await fetchEmails(vendorConfig.emailPatterns);
  const reports = await processEmails(emails, vendorConfig);
}
```

### 3. Report Processing Pipeline

Each report goes through a comprehensive processing pipeline:

1. **Extraction**: Extract the report attachment from email
2. **Parsing**: Parse the report format (CSV, Excel, PDF)
3. **Normalization**: Standardize data across vendors
4. **Storage**: Store in the database with metadata
5. **Analysis**: Generate insights with business impact scoring
6. **Distribution**: Distribute to appropriate stakeholders

### 4. Insight Generation Engine

The enhanced insight generator (`enhancedInsightGenerator.js`) provides:

- Prompt version tracking (v2.0.0)
- Business impact scoring
- Quality assessment
- Trend analysis with historical data
- Comprehensive metadata
- Structured output storage

### 5. Distribution System

The distribution service (`insightDistributionService.js`) handles:

- Role determination based on insight content
- Recipient selection based on roles
- Personalized content generation
- Email delivery and tracking
- Scheduled distribution

## Database Schema

The system uses the following database tables:

1. **report_sources**: Tracks where reports come from
2. **reports**: Stores processed report data
3. **insights**: Stores generated insights
4. **insight_distributions**: Tracks distribution to recipients
5. **historical_metrics**: Stores time-series data for trends
6. **report_processing_jobs**: Tracks status of processing jobs

## Usage Examples

### Processing Reports from All Vendors

```javascript
// Import the service
import multiVendorEmailIngestion from './src/services/multiVendorEmailIngestion.js';

// Process emails from all configured vendors
const results = await multiVendorEmailIngestion.checkEmailsFromAllVendors();
console.log(`Processed ${results.totalProcessed} reports`);
```

### Generating Enhanced Insights

```javascript
// Import the service
import { generateEnhancedInsights } from './src/services/enhancedInsightGenerator.js';

// Generate insights for a report
const insights = await generateEnhancedInsights(reportId, {
  includeBusinessImpact: true,
  includeTrendAnalysis: true
});

console.log(`Generated insights with quality score: ${insights.qualityScores.overall}`);
```

### Distributing Insights

```javascript
// Import the service
import { distributeInsights } from './src/services/insightDistributionService.js';

// Distribute insights to appropriate roles
const result = await distributeInsights(insightId, {
  specificRoles: ['executive', 'sales', 'inventory'],
  sendEmails: true
});

console.log(`Distributed to ${result.distributionsCreated} recipients`);
```

## Testing

The system includes several test scripts:

1. `test-multi-vendor-simple.js`: Simple demonstration of the multi-vendor capabilities
2. `test-multi-vendor-ingestion-distribution.js`: End-to-end test of the full pipeline
3. `push-report-schema.js`: Database schema creation script

To run a basic test:

```bash
node test-multi-vendor-simple.js [vendor]
```

## Extending the System

### Adding a New Vendor

1. Add vendor configuration to `configs/multi-vendor.json`
2. Create sample data generator if needed for testing
3. Test with `test-multi-vendor-simple.js [new-vendor]`

### Customizing Role Distribution

Modify the distribution rules in the `determineTargetRoles` function in `insightDistributionService.js`.