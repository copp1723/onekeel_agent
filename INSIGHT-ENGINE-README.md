# Enhanced Insight Engine

This document provides details about the enhanced insight engine, its capabilities, components, and integration points.

## Overview

The Enhanced Insight Engine is designed to generate high-quality, actionable business insights from automotive dealership data. It uses a combination of specialized prompts, quality evaluation metrics, and role-based distribution to ensure insights are valuable and reach the right stakeholders.

## Architecture

The system consists of several key components:

1. **Enhanced Insight Generator**: Core engine that analyzes data using specialized prompts
2. **Quality Evaluation**: Assesses insight quality across multiple dimensions
3. **Business Impact Assessment**: Evaluates potential financial outcomes
4. **Visualization Recommendations**: Suggests effective data visualizations
5. **Insight Distribution Service**: Delivers insights to appropriate stakeholders
6. **Mailer Service**: Handles email delivery with SendGrid and Nodemailer support

## Insight Generation Process

The insight generation follows these steps:

1. **Data Ingestion**: Data from CRM platforms (VinSolutions, VAUTO, DealerTrack) is ingested
2. **Primary Analysis**: The automotive analyst prompt generates structured insights
3. **Quality Evaluation**: Insights are scored across multiple dimensions
4. **Business Impact Assessment**: Potential revenue, cost, and customer impacts are evaluated
5. **Visualization Enhancement**: Appropriate visualization recommendations are added
6. **Role Adaptation**: Insights are tailored for different stakeholder roles
7. **Distribution**: Insights are delivered through configured channels

## Quality Evaluation

Insights are evaluated across multiple dimensions:

- **Completeness**: How thorough the analysis is (1-10)
- **Relevance**: How aligned insights are with business goals (1-10)
- **Specificity**: How detailed and concrete the recommendations are (1-10)
- **Coherence**: How well insights connect and flow logically (1-10)
- **Innovation**: How novel and creative the suggestions are (1-10)

The overall quality score is a weighted average of these dimensions.

## Business Impact Assessment

Business impact is assessed across three key areas:

- **Revenue Impact**: Potential gain and confidence level
- **Cost Impact**: Potential savings and confidence level
- **Customer Impact**: Impact level and description

## Role-Based Distribution

The system supports tailoring insights for different stakeholder roles:

- **EXECUTIVE**: Focus on business impact, financial outcomes, and strategic implications
- **SALES_MANAGER**: Focus on sales performance, team metrics, and opportunity identification
- **MARKETING**: Focus on market trends, customer preferences, and campaign effectiveness

## Distribution Channels

Insights can be distributed through multiple channels:

- **Email**: HTML-formatted emails with insights, metrics, and recommendations
- **File**: JSON files with complete insight data
- **Dashboard**: (Placeholder) For future web dashboard integration
- **API**: (Placeholder) For future external system integration

## Delivery Scheduling

Distribution frequency can be configured per stakeholder:

- **IMMEDIATE**: Distribute as soon as insights are generated
- **DAILY**: Distribute once per day
- **WEEKLY**: Distribute once per week
- **MONTHLY**: Distribute once per month

## Sample Data Support

The system includes sample automotive dealership data for testing purposes. To use sample data, set `USE_SAMPLE_DATA=true` in the environment variables or pass the option in the configuration.

## Mailer Service

Email delivery is handled by the Mailer Service, which supports:

- SendGrid API (primary delivery method)
- Nodemailer (fallback delivery method)
- Test preview URLs for development

## Implementing the Insight Engine

### Basic Usage

```javascript
import { generateEnhancedInsights } from './src/services/enhancedInsightGenerator.js';
import { createDistributionConfig, distributeInsights } from './src/services/insightDistributionService.js';

// Generate insights
const data = [...]; // Your CRM data
const platform = 'VinSolutions';
const enhancedInsights = await generateEnhancedInsights(data, platform);

// Create distribution configuration
const executiveConfig = createDistributionConfig(
  'executive@example.com',
  'EXECUTIVE',
  'John Executive',
  [platform],
  ['EMAIL', 'FILE'],
  'IMMEDIATE'
);

// Distribute insights
const result = await distributeInsights(enhancedInsights, executiveConfig);
```

### Testing

Use the test script to verify the functionality:

```bash
node test-insight-engine-stability.js
```

This will generate insights using sample data and test the distribution process.

## File Structure

Key files for the insight engine:

- `src/services/enhancedInsightGenerator.js` - Core insight generation service
- `src/services/insightDistributionService.js` - Role-based distribution service
- `src/services/mailerService.js` - Email delivery service
- `src/prompts/*.json` - Specialized prompt files
- `src/utils/promptEngine.js` - Prompt management utility

## Result Storage

All generated insights are stored in the file system with this structure:

```
/results
  /[platform]
    /[date]
      - [platform]-[timestamp].json  // Original insights
      /distributions
        /executive
          - [platform]-executive-[timestamp].json
        /sales_manager
          - [platform]-sales_manager-[timestamp].json
        /marketing
          - [platform]-marketing-[timestamp].json
```

## Extensibility

The system is designed to be extensible:

- Add new prompts by creating JSON files in the `src/prompts` directory
- Add new distribution channels by implementing new channel handlers
- Support additional platforms by adding platform-specific data processing

## Future Enhancements

Planned enhancements include:

1. Integration with a web dashboard for insight visualization
2. Enhanced search and historical trend analysis
3. Feedback mechanism to improve insight quality over time
4. Multi-language support for global dealerships