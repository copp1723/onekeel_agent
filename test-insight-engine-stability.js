/**
 * Test script for the Enhanced Insight Engine with Stability Features
 * 
 * This script tests the full insight generation pipeline with quality scoring,
 * business impact assessment, visualization recommendations, and distribution
 * to role-specific stakeholders.
 * 
 * Set USE_SAMPLE_DATA=true to use sample data for testing without real API calls.
 * Set environment variables for email testing:
 * - SENDGRID_API_KEY - For SendGrid email delivery
 * - TEST_EMAIL_ADDRESS - For email delivery testing (recipient)
 */

import fs from 'fs/promises';
import path from 'path';
import { generateEnhancedInsights } from './src/services/enhancedInsightGenerator.js';
import { 
  createDistributionConfig, 
  distributeInsights,
  DISTRIBUTION_CHANNEL,
  DELIVERY_FREQUENCY
} from './src/services/insightDistributionService.js';

// Sample data for testing
const SAMPLE_DATA = [
  {
    "id": "S12345",
    "make": "Toyota",
    "model": "RAV4",
    "year": 2023,
    "trim": "XLE",
    "sale_date": "2024-05-01",
    "price": 32950,
    "cost": 29200,
    "gross_profit": 3750,
    "days_in_inventory": 14,
    "sales_rep": "John Smith",
    "finance_products": 2,
    "body_style": "SUV"
  },
  {
    "id": "S12346",
    "make": "Honda",
    "model": "Accord",
    "year": 2022,
    "trim": "Sport",
    "sale_date": "2024-05-02",
    "price": 28500,
    "cost": 25800,
    "gross_profit": 2700,
    "days_in_inventory": 21,
    "sales_rep": "Mary Johnson",
    "finance_products": 1,
    "body_style": "Sedan"
  },
  {
    "id": "S12347",
    "make": "Volvo",
    "model": "XC90",
    "year": 2023,
    "trim": "Momentum",
    "sale_date": "2024-05-03",
    "price": 56950,
    "cost": 51200,
    "gross_profit": 5750,
    "days_in_inventory": 8,
    "sales_rep": "John Smith",
    "finance_products": 3,
    "body_style": "SUV"
  },
  {
    "id": "S12348",
    "make": "BMW",
    "model": "X5",
    "year": 2024,
    "trim": "xDrive40i",
    "sale_date": "2024-05-04",
    "price": 65490,
    "cost": 59200,
    "gross_profit": 6290,
    "days_in_inventory": 12,
    "sales_rep": "John Smith",
    "finance_products": 2,
    "body_style": "SUV"
  },
  {
    "id": "S12349",
    "make": "Ford",
    "model": "Mustang",
    "year": 2023,
    "trim": "GT",
    "sale_date": "2024-05-05",
    "price": 48750,
    "cost": 44250,
    "gross_profit": 4500,
    "days_in_inventory": 18,
    "sales_rep": "Sarah Davis",
    "finance_products": 1,
    "body_style": "Coupe"
  },
  {
    "id": "S12350",
    "make": "Honda",
    "model": "Civic",
    "year": 2024,
    "trim": "EX",
    "sale_date": "2024-05-06",
    "price": 26150,
    "cost": 24200,
    "gross_profit": 1950,
    "days_in_inventory": 24,
    "sales_rep": "Mary Johnson",
    "finance_products": 0,
    "body_style": "Sedan"
  },
  {
    "id": "S12351",
    "make": "Tesla",
    "model": "Model Y",
    "year": 2024,
    "trim": "Long Range",
    "sale_date": "2024-05-07",
    "price": 54990,
    "cost": 50200,
    "gross_profit": 4790,
    "days_in_inventory": 5,
    "sales_rep": "John Smith",
    "finance_products": 2,
    "body_style": "SUV"
  },
  {
    "id": "S12352",
    "make": "Toyota",
    "model": "Camry",
    "year": 2023,
    "trim": "XSE",
    "sale_date": "2024-05-08",
    "price": 29950,
    "cost": 27400,
    "gross_profit": 2550,
    "days_in_inventory": 28,
    "sales_rep": "Sarah Davis",
    "finance_products": 1,
    "body_style": "Sedan"
  }
];

/**
 * Run a test of the enhanced insight engine with stability features
 */
async function testInsightEngineStability() {
  try {
    console.log('Testing Enhanced Insight Engine with Stability Features...');
    
    // Step 1: Generate enhanced insights with quality evaluation
    const platform = 'VinSolutions';
    const data = SAMPLE_DATA;
    
    console.log(`Generating insights for ${platform} with ${data.length} records...`);
    const enhancedInsights = await generateEnhancedInsights(data, platform, { verbose: true });
    
    console.log('\nInsight Generation Results:');
    console.log('- Primary insights prompt:', enhancedInsights.metadata.promptName);
    console.log('- Prompt version:', enhancedInsights.metadata.promptVersion);
    console.log('- Quality score:', enhancedInsights.quality.overall_score);
    console.log('- Quality dimensions:', JSON.stringify(enhancedInsights.quality.quality_dimensions, null, 2));
    console.log('- Business impact revenue potential:', enhancedInsights.business_impact.revenue_impact.potential_gain);
    
    // Step 2: Create distribution configurations for different roles
    console.log('\nCreating distribution configurations for different roles...');
    
    const distributionConfigs = [];
    
    // Test email address for distribution testing
    const testEmail = process.env.TEST_EMAIL_ADDRESS || 'test@example.com';
    
    // Executive role configuration
    const executiveConfig = createDistributionConfig(
      testEmail,
      'EXECUTIVE',
      'John Executive',
      [platform],
      [DISTRIBUTION_CHANNEL.EMAIL, DISTRIBUTION_CHANNEL.FILE],
      DELIVERY_FREQUENCY.IMMEDIATE
    );
    distributionConfigs.push(executiveConfig);
    
    // Sales Manager role configuration
    const salesManagerConfig = createDistributionConfig(
      testEmail,
      'SALES_MANAGER',
      'Mary Manager',
      [platform],
      [DISTRIBUTION_CHANNEL.FILE],
      DELIVERY_FREQUENCY.IMMEDIATE
    );
    distributionConfigs.push(salesManagerConfig);
    
    // Marketing role configuration
    const marketingConfig = createDistributionConfig(
      testEmail,
      'MARKETING',
      'Dave Marketing',
      [platform],
      [DISTRIBUTION_CHANNEL.FILE],
      DELIVERY_FREQUENCY.IMMEDIATE
    );
    distributionConfigs.push(marketingConfig);
    
    console.log(`Created ${distributionConfigs.length} distribution configurations`);
    
    // Step 3: Distribute insights to different roles
    console.log('\nDistributing insights to stakeholders...');
    
    for (const config of distributionConfigs) {
      console.log(`\nDistributing to ${config.role} (${config.name})...`);
      const result = await distributeInsights(enhancedInsights, config);
      
      if (result.success) {
        console.log(`✓ Successfully distributed insights to ${config.role}`);
        
        for (const channelResult of result.distribution.channelResults) {
          console.log(`  - ${channelResult.channel}: ${channelResult.success ? 'Success' : 'Failed'} - ${channelResult.message}`);
          
          if (channelResult.channel === DISTRIBUTION_CHANNEL.EMAIL && channelResult.success && channelResult.previewUrl) {
            console.log(`    Preview URL: ${channelResult.previewUrl}`);
          }
        }
      } else {
        console.error(`✗ Failed to distribute insights to ${config.role}: ${result.message}`);
      }
    }
    
    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('Error testing insight engine stability:', error);
  }
}

// Run the test
testInsightEngineStability();