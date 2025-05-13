# Enhanced Insight Engine

The Enhanced Insight Engine is a powerful component of our AI agent backend system that generates high-quality, actionable insights from automotive dealership data. It combines specialized prompts, quality scoring, business impact assessment, and role-based distribution to deliver valuable intelligence to dealership stakeholders.

## Components

### 1. Enhanced Prompt System

The engine uses a modular prompt architecture with specialized prompts stored in JSON format:

- **Automotive Analyst (v2.0.0)**: Generates structured insights from automotive data
- **Business Impact Assessment (v2.0.0)**: Quantifies potential business outcomes
- **Quality Evaluation (v2.0.0)**: Scores insights across multiple quality dimensions
- **Tone-Adaptive Communication (v2.0.0)**: Adapts content for different stakeholder roles
- **Visualization Enhancement (v2.0.0)**: Recommends effective data visualizations

### 2. Insight Generator

The `enhancedInsightGenerator.js` service orchestrates the insight generation process:

```javascript
// Generate basic insights
const basicInsights = await generateEnhancedInsights(dealershipData, {
  platform: 'VinSolutions',
  saveResults: true
});

// Generate comprehensive insights with all options
const comprehensiveInsights = await generateEnhancedInsights(dealershipData, {
  platform: 'VinSolutions',
  evaluateQuality: true,
  assessBusinessImpact: true,
  generateVisualizations: true,
  adaptForStakeholders: true,
  saveResults: true
});

// Generate insights with quality scoring
const qualityScoredInsights = await generateInsightsWithQualityScoring(dealershipData, {
  platform: 'VinSolutions',
  saveResults: true
});
```

### 3. Quality Scoring System

Each insight is evaluated across multiple dimensions:

- **Completeness**: How thoroughly the insights address key business questions (1-10)
- **Relevance**: How directly the insights relate to core business objectives (1-10)
- **Specificity**: How precise and detailed the recommendations are (1-10)
- **Coherence**: How logically structured and internally consistent the insights are (1-10)
- **Innovation**: How novel and creative the suggested approaches are (1-10)

The system provides an overall quality score (1-100) as well as specific strengths, improvement areas, and verification steps.

### 4. Role-Based Distribution

The `insightDistributionService.js` adapts and delivers insights to different stakeholders based on their roles:

- **Executive**: C-suite leaders focused on strategic insights
- **Sales Manager**: Sales leadership focused on team performance
- **Marketing**: Marketing team focused on campaign effectiveness
- **Finance**: Finance team focused on financial analysis
- **Service**: Service department focused on customer retention

```javascript
// Distribute insights to stakeholders
const distributionResults = await distributeInsights(insights, stakeholders);

// Schedule regular distribution
const scheduleConfig = await scheduleDistribution(
  'Dealership Performance Report',
  stakeholders,
  {
    frequency: 'WEEKLY',
    dayOfWeek: 'MONDAY',
    time: '09:00'
  }
);
```

## Data Flow

1. **Data Ingestion**: Raw dealership data is loaded from email reports or browser automation
2. **Preprocessing**: Data is normalized, cleaned, and enriched with summary statistics
3. **Insight Generation**: Specialized prompts analyze the data to generate structured insights
4. **Quality Evaluation**: Insights are scored across multiple quality dimensions
5. **Business Impact Assessment**: Potential business outcomes are quantified
6. **Stakeholder Adaptation**: Content is tailored for different stakeholder roles
7. **Distribution**: Insights are delivered via email, dashboard, or API endpoints
8. **Storage**: All results are saved with proper versioning and metadata

## Implementation Details

### Folder Structure

```
src/
├── prompts/                    # Specialized prompt files
│   ├── automotive-analyst.json
│   ├── business-impact.json
│   ├── quality-evaluation.json
│   ├── tone-adaptive.json
│   └── visualization-enhanced.json
├── services/
│   ├── enhancedInsightGenerator.js  # Main insight generation service
│   └── insightDistributionService.js # Role-based distribution
└── utils/
    └── promptEngine.js         # Prompt loading and execution utilities
results/
└── {platform}/                 # Results organized by platform
    └── {date}/                 # Further organized by date
        └── insights-{timestamp}.json # Individual insight results
```

### Insight Output Format

Each insight result includes:

- **Metadata**: Timestamp, platform, record count, version info
- **Primary Insights**: The core analytical findings
- **Quality Scores**: Evaluation across quality dimensions
- **Business Impact**: Assessment of potential business outcomes
- **Visualization Recommendations**: Suggestions for effective visualizations
- **Stakeholder Briefings**: Role-specific content adaptations

## Testing

The system includes comprehensive test scripts:

- `test-prompt-engine.js`: Tests prompt loading and execution
- `test-insight-engine-stability.js`: Tests insight generation across vendors
- `test-distribution-service.js`: Tests role-based distribution

## Extending the System

To add new insight types:

1. Create a new prompt file in `src/prompts/` following the established format
2. Add corresponding logic to the insight generator service
3. Update distribution role mappings if needed
4. Add test cases to validate the new insight type

## Example Usage

```javascript
// Import the services
import { generateEnhancedInsights } from './src/services/enhancedInsightGenerator.js';
import { distributeInsights } from './src/services/insightDistributionService.js';

// Generate insights from dealership data
const insights = await generateEnhancedInsights(dealershipData, {
  platform: 'VinSolutions',
  evaluateQuality: true,
  assessBusinessImpact: true,
  adaptForStakeholders: true,
  saveResults: true
});

// Define stakeholders for distribution
const stakeholders = [
  {
    id: 'user-123',
    name: 'John Smith',
    role: 'EXECUTIVE',
    email: 'john.smith@dealership.com'
  },
  // Additional stakeholders...
];

// Distribute insights to stakeholders
const distributionResults = await distributeInsights(insights, stakeholders);
console.log(`Successfully distributed to ${distributionResults.successful.length} stakeholders`);
```