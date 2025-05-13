# Enhanced Prompt System

This document provides an overview of the enhanced prompt system used for generating high-quality, actionable automotive dealership insights.

## Overview

The enhanced prompt system utilizes five specialized prompts, each designed for a specific aspect of the insight generation and delivery process:

1. **Automotive Analyst**: Generates primary automotive dealership insights with structured outputs
2. **Quality Evaluation**: Evaluates insight quality across multiple dimensions
3. **Business Impact**: Assesses potential financial outcomes and implementation considerations
4. **Visualization-Enhanced**: Recommends effective data visualizations for presenting insights
5. **Tone-Adaptive**: Adapts insights for different stakeholder roles (Executive, Sales Manager, Marketing)

## Prompt Files

All prompts are stored as JSON files in the `src/prompts` directory:

- `automotive-analyst.json`
- `quality-evaluation.json`
- `business-impact.json`
- `visualization-enhanced.json`
- `tone-adaptive.json`

## Prompt Structure

Each prompt file follows a standardized structure:

```json
{
  "version": "v2.0.0",
  "last_updated": "2025-05-13T00:00:00.000Z",
  "author": "AI Agent Team",
  "model": "gpt-4o",
  "temperature": 0.3,
  "max_tokens": 2000,
  "response_format": "json",
  "system_prompt": "...",
  "user_prompt_template": "...",
  "examples": [...]
}
```

Key components include:
- **version**: Following semantic versioning
- **model**: The OpenAI model to use (gpt-4o is the default)
- **temperature**: Controlling randomness (lower values for more deterministic outputs)
- **response_format**: Setting expected output format
- **system_prompt**: Defining the prompt's role and output structure
- **user_prompt_template**: The template with placeholders
- **examples**: Few-shot examples for better performance

## Prompt Engine (promptEngine.js)

The prompt engine provides a unified interface for working with prompts:

- **loadPrompt(promptName)**: Loads a prompt by name
- **getAllPrompts()**: Gets all available prompts
- **executePrompt(promptName, data, options)**: Executes a prompt with data
- **savePrompt(promptName, promptConfig)**: Creates or updates a prompt

## Enhanced Insight Generation Process

The insight generation process follows these steps:

1. **Generate Primary Insights**: Using the automotive-analyst prompt
2. **Evaluate Quality**: Score insights across multiple dimensions
3. **Assess Business Impact**: Evaluate financial outcomes and implementation considerations
4. **Generate Visualization Recommendations**: Suggest effective ways to visualize the data
5. **Adapt for Stakeholders**: Create role-specific versions for different stakeholders

## Role-Based Insight Distribution

The system supports adapting insights for different stakeholder roles:

- **EXECUTIVE**: Focused on business impact, financial outcomes, and strategic implications
- **SALES_MANAGER**: Focused on sales performance, team metrics, and opportunity identification
- **MARKETING**: Focused on market trends, customer preferences, and campaign effectiveness

## Quality Evaluation Dimensions

Insights are evaluated across these dimensions:

- **Completeness**: How thorough the analysis is
- **Relevance**: How aligned insights are with business goals
- **Specificity**: How detailed and concrete the recommendations are
- **Coherence**: How well insights connect and flow logically
- **Innovation**: How novel and creative the suggestions are

## Using the Enhanced Prompt System

```javascript
import { executePrompt } from './src/utils/promptEngine.js';
import { generateEnhancedInsights } from './src/services/enhancedInsightGenerator.js';

// Generate insights with quality evaluation
const enhancedInsights = await generateEnhancedInsights(data, 'VinSolutions');

// Generate role-specific insights
const executiveInsights = await generateRoleSpecificInsights(
  enhancedInsights, 
  'EXECUTIVE'
);
```

## Testing

Use the provided test script to verify the functionality:

```bash
node test-insight-engine-stability.js
```

This will generate insights using sample data and test the distribution process.

## Customizing Prompts

To modify a prompt, edit its JSON file in the `src/prompts` directory. Always increment the version number when making significant changes.