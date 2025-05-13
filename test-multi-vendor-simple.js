/**
 * Simplified Multi-Vendor Email Ingestion Test
 * 
 * This script demonstrates the multi-vendor email ingestion system
 * by creating sample data for different vendors and generating insights.
 * 
 * Usage: node test-multi-vendor-simple.js [vendor]
 * Example: node test-multi-vendor-simple.js VinSolutions
 */

import fs from 'fs';
import path from 'path';

// Simulate sample data approach
process.env.USE_SAMPLE_DATA = 'true';

// Sample vendor data
const sampleVendorData = {
  VinSolutions: {
    records: [
      { Date: '2025-05-13', Customer: 'Customer A', Vehicle: 'Honda Accord', Status: 'New Lead', Price: 32500, DaysOnLot: 15, LeadSource: 'Website', SalesPerson: 'Rep 1' },
      { Date: '2025-05-13', Customer: 'Customer B', Vehicle: 'Toyota Camry', Status: 'Test Drive', Price: 29800, DaysOnLot: 22, LeadSource: 'Phone', SalesPerson: 'Rep 2' },
      { Date: '2025-05-13', Customer: 'Customer C', Vehicle: 'Ford F-150', Status: 'Negotiation', Price: 45600, DaysOnLot: 8, LeadSource: 'Walk-in', SalesPerson: 'Rep 3' },
      { Date: '2025-05-13', Customer: 'Customer D', Vehicle: 'Chevrolet Tahoe', Status: 'Purchased', Price: 52300, DaysOnLot: 30, LeadSource: 'Referral', SalesPerson: 'Rep 1' },
      { Date: '2025-05-13', Customer: 'Customer E', Vehicle: 'Nissan Altima', Status: 'New Lead', Price: 26400, DaysOnLot: 12, LeadSource: 'Website', SalesPerson: 'Rep 4' }
    ]
  },
  VAUTO: {
    records: [
      { 'Report Date': '2025-05-13', 'Stock#': 'A123', 'VIN': '1HGCM82633A123456', 'Make': 'Honda', 'Model': 'Accord', 'Price': 32500, 'Cost': 29500, 'Age': 15, 'Category': 'Sedan', 'Source': 'Auction' },
      { 'Report Date': '2025-05-13', 'Stock#': 'B234', 'VIN': '2T1BU4EE2AC123456', 'Make': 'Toyota', 'Model': 'Camry', 'Price': 29800, 'Cost': 27000, 'Age': 22, 'Category': 'Sedan', 'Source': 'Trade-in' },
      { 'Report Date': '2025-05-13', 'Stock#': 'C345', 'VIN': '1FTEX1EM5EF123456', 'Make': 'Ford', 'Model': 'F-150', 'Price': 45600, 'Cost': 41200, 'Age': 8, 'Category': 'Truck', 'Source': 'Dealer Transfer' },
      { 'Report Date': '2025-05-13', 'Stock#': 'D456', 'VIN': '3GNFK16Z23G123456', 'Make': 'Chevrolet', 'Model': 'Tahoe', 'Price': 52300, 'Cost': 47800, 'Age': 30, 'Category': 'SUV', 'Source': 'Auction' },
      { 'Report Date': '2025-05-13', 'Stock#': 'E567', 'VIN': '1N4AL3AP8DN123456', 'Make': 'Nissan', 'Model': 'Altima', 'Price': 26400, 'Cost': 23500, 'Age': 12, 'Category': 'Sedan', 'Source': 'Trade-in' }
    ]
  },
  DealerTrack: {
    records: [
      { 'Transaction Date': '2025-05-13', 'Deal #': 'DT123', 'Customer Name': 'Customer A', 'Vehicle': 'Honda Accord', 'Amount': 32500, 'Term': 60, 'Rate': 3.9, 'Product': 'Finance', 'Type': 'New' },
      { 'Transaction Date': '2025-05-13', 'Deal #': 'DT234', 'Customer Name': 'Customer B', 'Vehicle': 'Toyota Camry', 'Amount': 29800, 'Term': 72, 'Rate': 4.2, 'Product': 'Lease', 'Type': 'New' },
      { 'Transaction Date': '2025-05-13', 'Deal #': 'DT345', 'Customer Name': 'Customer C', 'Vehicle': 'Ford F-150', 'Amount': 45600, 'Term': 60, 'Rate': 3.5, 'Product': 'Finance', 'Type': 'Used' },
      { 'Transaction Date': '2025-05-13', 'Deal #': 'DT456', 'Customer Name': 'Customer D', 'Vehicle': 'Chevrolet Tahoe', 'Amount': 52300, 'Term': 48, 'Rate': 2.9, 'Product': 'Finance', 'Type': 'New' },
      { 'Transaction Date': '2025-05-13', 'Deal #': 'DT567', 'Customer Name': 'Customer E', 'Vehicle': 'Nissan Altima', 'Amount': 26400, 'Term': 72, 'Rate': 4.5, 'Product': 'Lease', 'Type': 'New' }
    ]
  }
};

/**
 * Configuration for each vendor
 */
const vendorConfigs = {
  VinSolutions: {
    emailPatterns: {
      fromAddresses: ['reports@vinsolutions.com', 'no-reply@vinsolutions.com'],
      subjectPatterns: ['Daily Report', 'Weekly Summary', 'Monthly Analytics'],
      attachmentTypes: ['csv', 'xlsx']
    },
    extractorConfig: {
      type: 'csv',
      dateColumn: 'Date',
      keyColumns: ['Customer', 'Vehicle', 'Status'],
      numericalColumns: ['Price', 'DaysOnLot'],
      categoryColumns: ['LeadSource', 'SalesPerson']
    }
  },
  VAUTO: {
    emailPatterns: {
      fromAddresses: ['reports@vauto.com', 'analytics@vauto.com'],
      subjectPatterns: ['Inventory Report', 'Pricing Analysis'],
      attachmentTypes: ['xlsx', 'pdf']
    },
    extractorConfig: {
      type: 'excel',
      sheets: ['Summary', 'Detail'],
      dateColumn: 'Report Date',
      keyColumns: ['Stock#', 'VIN', 'Make', 'Model'],
      numericalColumns: ['Price', 'Cost', 'Age'],
      categoryColumns: ['Category', 'Source']
    }
  },
  DealerTrack: {
    emailPatterns: {
      fromAddresses: ['reports@dealertrack.com', 'noreply@dealertrack.com'],
      subjectPatterns: ['F&I Report', 'Finance Summary', 'Daily Transactions'],
      attachmentTypes: ['xlsx', 'pdf', 'csv']
    },
    extractorConfig: {
      type: 'csv',
      dateColumn: 'Transaction Date',
      keyColumns: ['Deal #', 'Customer Name', 'Vehicle'],
      numericalColumns: ['Amount', 'Term', 'Rate'],
      categoryColumns: ['Product', 'Type']
    }
  }
};

// Distribution roles configuration
const distributionRoles = {
  inventory: {
    emails: ['inventory-manager@dealership.com'],
    insightTypes: ['inventory_health', 'pricing_strategy', 'market_comparison']
  },
  sales: {
    emails: ['sales-manager@dealership.com', 'team-leads@dealership.com'],
    insightTypes: ['lead_performance', 'conversion_metrics', 'sales_trends']
  },
  finance: {
    emails: ['finance-director@dealership.com'],
    insightTypes: ['finance_performance', 'product_penetration', 'profitability']
  },
  executive: {
    emails: ['gm@dealership.com', 'owner@dealership.com'],
    insightTypes: ['summary', 'strategic_recommendations', 'market_position']
  }
};

/**
 * Simulate the process of ingesting and processing data from multiple vendors
 */
async function testMultiVendorSystem() {
  try {
    console.log('\n=== MULTI-VENDOR EMAIL INGESTION & DISTRIBUTION TEST ===\n');
    
    // Get vendor from command line or use all
    const requestedVendor = process.argv[2];
    const vendors = requestedVendor 
      ? [requestedVendor]
      : Object.keys(sampleVendorData);
    
    console.log(`Testing with vendors: ${vendors.join(', ')}`);
    
    // Create downloads directory if it doesn't exist
    const downloadsDir = './downloads';
    if (!fs.existsSync(downloadsDir)) {
      fs.mkdirSync(downloadsDir, { recursive: true });
    }
    
    // Create results directory if it doesn't exist
    const resultsDir = './results';
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }
    
    // Process each vendor
    for (const vendor of vendors) {
      console.log(`\n--- Processing ${vendor} ---`);
      
      if (!sampleVendorData[vendor]) {
        console.error(`Unknown vendor: ${vendor}`);
        continue;
      }
      
      // Step 1: Simulate email ingestion
      console.log('Step 1: Simulating email ingestion...');
      
      const config = vendorConfigs[vendor];
      const records = sampleVendorData[vendor].records;
      
      console.log(`Found ${records.length} records in email`);
      
      // Step 2: Save to CSV file
      console.log('Step 2: Saving to file...');
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `${vendor}_${timestamp}.csv`;
      const filePath = path.join(downloadsDir, fileName);
      
      // Extract keys from first record
      const headers = Object.keys(records[0]).join(',');
      
      // Convert each record to CSV row
      const rows = records.map(record => 
        Object.values(record).map(v => typeof v === 'string' ? `"${v}"` : v).join(',')
      );
      
      // Write CSV file
      const csvContent = [headers, ...rows].join('\n');
      fs.writeFileSync(filePath, csvContent);
      
      console.log(`Saved to ${filePath}`);
      
      // Step 3: Generate insights
      console.log('Step 3: Generating insights...');
      
      // Create vendor directory if it doesn't exist
      const vendorDir = path.join(resultsDir, vendor);
      if (!fs.existsSync(vendorDir)) {
        fs.mkdirSync(vendorDir, { recursive: true });
      }
      
      // Create date directory if it doesn't exist
      const dateDir = path.join(vendorDir, new Date().toISOString().split('T')[0]);
      if (!fs.existsSync(dateDir)) {
        fs.mkdirSync(dateDir, { recursive: true });
      }
      
      // Generate sample insights
      const insights = generateSampleInsights(vendor, records);
      
      // Save insights to file
      const insightFileName = `insights_v2.0.0_${timestamp}.json`;
      const insightFilePath = path.join(dateDir, insightFileName);
      
      fs.writeFileSync(insightFilePath, JSON.stringify(insights, null, 2));
      
      console.log(`Generated insights saved to ${insightFilePath}`);
      
      // Step 4: Distribute insights
      console.log('Step 4: Distributing insights...');
      
      // Determine which roles should receive these insights
      const targetRoles = determineTargetRoles(insights, vendor);
      
      console.log(`Distributing to roles: ${targetRoles.join(', ')}`);
      
      // For each role, generate personalized content
      for (const role of targetRoles) {
        if (!distributionRoles[role]) {
          console.warn(`Unknown role: ${role}`);
          continue;
        }
        
        const roleEmails = distributionRoles[role].emails;
        console.log(`Role ${role}: ${roleEmails.length} recipient(s)`);
        
        // Generate personalized email content
        for (const email of roleEmails) {
          const emailContent = generatePersonalizedEmail(email, role, insights, vendor);
          console.log(`  ✓ Would send email to ${email} with subject: ${emailContent.subject}`);
        }
      }
    }
    
    console.log('\n=== TEST COMPLETED SUCCESSFULLY ===');
    
  } catch (error) {
    console.error('\n❌ TEST ERROR:');
    console.error(error);
    process.exit(1);
  }
}

/**
 * Generate sample insights for a vendor
 */
function generateSampleInsights(vendor, records) {
  // Base insights structure common to all vendors
  const baseInsights = {
    summary: `Strong performance with increasing customer interest from ${records[0].LeadSource || 'multiple sources'}.`,
    keyPerformanceIndicators: {
      leadConversion: {
        rate: "24%",
        change: "+3% from last period",
        performingSegments: ["SUVs", "Luxury Vehicles"]
      },
      salesBySource: {
        website: "42%",
        phone: "28%",
        walkIn: "18%",
        referral: "12%"
      }
    },
    opportunities: [
      {
        title: "Enhance Website Lead Follow-up Process",
        description: "Website leads show 15% higher conversion when initial response is under 30 minutes",
        potentialImpact: "$83,500 in additional gross profit based on current traffic",
        actionSteps: [
          "Implement automated immediate response system",
          "Create dedicated website lead specialist position",
          "Develop tailored follow-up templates by vehicle category"
        ],
        priority: "High",
        owner: "Digital Marketing Manager"
      }
    ],
    riskAreas: [
      {
        title: "Rising Floor Plan Costs",
        description: "Floor plan interest expense increased 18% due to aged inventory and higher rates",
        mitigationStrategy: "Implement 45-day inventory turn target and weekly aging review"
      }
    ],
    strategicRecommendations: [
      "Implement dedicated BDC team structure with specialized roles for website, phone, and follow-up",
      "Create omnichannel customer experience to improve seamless transitions between digital and in-store"
    ],
    metadata: {
      timestamp: new Date().toISOString(),
      platform: vendor,
      promptVersion: "2.0.0",
      recordCount: records.length
    },
    qualityScores: {
      overall: 0.85,
      dimensions: {
        completeness: 1.0,
        relevance: 0.85,
        specificity: 0.7,
        coherence: 0.9,
        innovation: 0.75
      }
    },
    businessImpact: {
      revenueImpact: {
        total: 83500,
        confidence: "medium",
        details: [],
        timeframe: "quarterly"
      },
      costSavings: {
        total: 24500,
        confidence: "medium",
        details: [],
        timeframe: "quarterly"
      },
      customerImpact: {
        score: 7.5,
        impactLevel: "high",
        impactAreas: ["Lead response time", "Customer experience"]
      },
      urgencyFactors: {
        competitiveThreats: true,
        timeConstraints: false,
        seasonalOpportunity: true,
        financialUrgency: true,
        regulatoryRequirements: false,
        overallUrgency: "high"
      },
      effortRequired: {
        implementationTimeframe: "medium-term",
        resourceIntensity: "medium",
        crossDepartmentCoordination: true,
        technicalComplexity: "medium",
        trainingNeeds: true,
        overallEffort: "medium"
      },
      overallImpact: {
        score: 7.8,
        impactLevel: "significant",
        breakdown: {
          financial: 8,
          customer: 7.5,
          urgency: 8,
          effort: 5
        }
      }
    }
  };
  
  // Add vendor-specific insights
  switch (vendor) {
    case 'VinSolutions':
      // CRM-focused insights
      baseInsights.keyPerformanceIndicators.averageSellTime = {
        newVehicles: "18 days",
        usedVehicles: "27 days",
        trend: "Used vehicle turn time increased by 4 days"
      };
      
      baseInsights.opportunities.push({
        title: "Improve CRM Usage Compliance",
        description: "30% of sales staff not properly tracking customer interactions",
        potentialImpact: "$46,000 in additional sales through better follow-up",
        actionSteps: [
          "Create CRM usage dashboard for managers",
          "Implement daily activity minimum standards",
          "Develop automated follow-up templates for common scenarios"
        ],
        priority: "High",
        owner: "Sales Manager"
      });
      break;
      
    case 'VAUTO':
      // Inventory-focused insights
      baseInsights.summary = "Inventory age metrics showing improvement but pricing strategy needs adjustment.";
      
      baseInsights.opportunities.push({
        title: "Optimize Used Vehicle Inventory",
        description: "Current aged inventory (>30 days) is 23% above optimal levels",
        potentialImpact: "$112,000 in carrying cost reduction",
        actionSteps: [
          "Price adjustment on 14 identified slow-moving units",
          "Transfer 8 units to sister store with higher demand profile",
          "Adjust purchasing strategy based on turn rate analysis"
        ],
        priority: "High",
        owner: "Used Vehicle Manager"
      });
      break;
      
    case 'DealerTrack':
      // F&I-focused insights
      baseInsights.summary = "Strong F&I performance with opportunity to improve product penetration.";
      
      baseInsights.keyPerformanceIndicators.financeMetrics = {
        avgFrontEnd: "$1,285",
        avgBackEnd: "$1,105",
        productPenetration: "2.3 products per deal",
        trend: "+0.2 products per deal from previous month"
      };
      
      baseInsights.opportunities.push({
        title: "Increase GAP Insurance Penetration",
        description: "GAP penetration at 62% vs benchmark of 78% for similar dealers",
        potentialImpact: "$52,000 in additional annual profit",
        actionSteps: [
          "Create value presentation training for F&I staff",
          "Implement pre-introduction of product by sales team",
          "Develop customer-facing benefit materials"
        ],
        priority: "Medium",
        owner: "F&I Director"
      });
      break;
  }
  
  return baseInsights;
}

/**
 * Determine which roles should receive insights based on content
 */
function determineTargetRoles(insights, vendor) {
  const targetRoles = new Set();
  
  // Always include executive for high impact insights
  if (insights.businessImpact && 
      ['transformative', 'significant'].includes(insights.businessImpact.overallImpact?.impactLevel)) {
    targetRoles.add('executive');
  }
  
  // Check KPIs and opportunities for role-specific content
  const allText = JSON.stringify(insights);
  
  // Check for inventory focus
  if (allText.includes('inventory') || allText.includes('days on lot') || 
      allText.includes('turn') || allText.includes('stock')) {
    targetRoles.add('inventory');
  }
  
  // Check for sales focus
  if (allText.includes('sales') || allText.includes('lead') || 
      allText.includes('conversion') || allText.includes('traffic')) {
    targetRoles.add('sales');
  }
  
  // Check for finance focus
  if (allText.includes('finance') || allText.includes('F&I') || 
      allText.includes('profit') || allText.includes('revenue')) {
    targetRoles.add('finance');
  }
  
  // Add role based on vendor
  switch (vendor) {
    case 'VinSolutions':
      // CRM system - sales teams are primary audience
      targetRoles.add('sales');
      break;
    case 'VAUTO':
      // Inventory system - inventory teams are primary audience
      targetRoles.add('inventory');
      break;
    case 'DealerTrack':
      // F&I system - finance teams are primary audience
      targetRoles.add('finance');
      break;
  }
  
  return Array.from(targetRoles);
}

/**
 * Generate personalized email for a role
 */
function generatePersonalizedEmail(email, role, insights, vendor) {
  // Personalization based on role
  let roleIntro = '';
  let prioritizedInsights = [];
  
  switch (role) {
    case 'inventory':
      roleIntro = 'As Inventory Manager, here are your key insights:';
      // Prioritize inventory-focused insights
      if (insights.opportunities) {
        prioritizedInsights = insights.opportunities.filter(opp => 
          opp.title.toLowerCase().includes('inventory') || 
          opp.title.toLowerCase().includes('vehicle') ||
          opp.owner?.toLowerCase().includes('inventory')
        );
      }
      break;
    case 'sales':
      roleIntro = 'As Sales Manager, here are your key insights:';
      // Prioritize sales-focused insights
      if (insights.opportunities) {
        prioritizedInsights = insights.opportunities.filter(opp => 
          opp.title.toLowerCase().includes('sales') || 
          opp.title.toLowerCase().includes('lead') ||
          opp.owner?.toLowerCase().includes('sales')
        );
      }
      break;
    case 'finance':
      roleIntro = 'As Finance Director, here are your key insights:';
      // Prioritize finance-focused insights
      if (insights.opportunities) {
        prioritizedInsights = insights.opportunities.filter(opp => 
          opp.title.toLowerCase().includes('finance') || 
          opp.title.toLowerCase().includes('profit') ||
          opp.owner?.toLowerCase().includes('f&i')
        );
      }
      break;
    case 'executive':
      roleIntro = 'As GM/Owner, here is your executive summary:';
      // Provide strategic overview
      prioritizedInsights = insights.opportunities?.slice(0, 2) || [];
      break;
    default:
      roleIntro = 'Here are your dealership insights:';
      // Default to first opportunity
      prioritizedInsights = insights.opportunities?.slice(0, 1) || [];
  }
  
  // Generate email subject
  const subject = `${vendor} Insights Report: ${insights.summary || 'Dealership Insights'}`;
  
  return {
    subject,
    role,
    recipient: email,
    roleIntro,
    insights: prioritizedInsights
  };
}

// Run the test
testMultiVendorSystem();