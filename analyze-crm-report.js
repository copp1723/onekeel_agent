import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Parse the CRM report file
 */
function parseCRMReport(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.replace(/\r\n/g, '\n').split('\n');

  const sources = [];
  let currentSource = null;
  let inCustomerSection = false;
  let customerHeaders = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      inCustomerSection = false;
      continue;
    }

    // Flexible lead source header detection: name, then sold/total, then percent (allowing variable whitespace/tabs)
    const sourceMatch = line.match(/^(.+?)\s+[\t ]*(\d+)\/(\d+)\s*\((\d+\.?\d*)\s*%\)/);
    if (sourceMatch) {
      console.log(`Detected source: ${sourceMatch[1].trim()} (${sourceMatch[2]}/${sourceMatch[3]} - ${sourceMatch[4]}%)`);
      if (currentSource) sources.push(currentSource);
      currentSource = {
        name: sourceMatch[1].trim(),
        sold: parseInt(sourceMatch[2]),
        total: parseInt(sourceMatch[3]),
        conversionRate: parseFloat(sourceMatch[4]),
        customers: []
      };
      inCustomerSection = false;
      customerHeaders = [];
      continue;
    }

    // Detect the start of customer data
    if (/Customer Name/i.test(line)) {
      inCustomerSection = true;
      customerHeaders = line.split('\t').map(h => h.trim().toLowerCase());
      continue;
    }
    if (/delivered/i.test(line)) {
      inCustomerSection = true;
      continue;
    }

    // Parse customer data if in customer section
    if (inCustomerSection && currentSource) {
      const parts = line.split('\t');
      if (parts.length >= 2) {
        // Map columns dynamically based on headers if found
        let customer = {};
        if (customerHeaders.length > 0 && parts.length === customerHeaders.length) {
          customerHeaders.forEach((header, idx) => {
            customer[header.replace(/\s+/g, '')] = parts[idx]?.trim() || '';
          });
        } else {
          // Fallback to default mapping
          customer = {
            name: parts[0]?.trim() || '',
            email: parts[1]?.trim() || '',
            leadCost: parts[2]?.trim() || '',
            receivedDate: parts[3]?.trim() || ''
          };
        }
        currentSource.customers.push(customer);
      }
    }
  }

  if (currentSource) sources.push(currentSource);
  return sources;
}

/**
 * Generate insights using OpenAI
 */
async function generateInsights(reportData) {
  try {
    const prompt = `Analyze this CRM report and provide key insights and recommendations. Focus on:
1. Best performing lead sources
2. Conversion rates
3. Any patterns in customer data
4. Recommendations for improvement

Report Summary:
${JSON.stringify(reportData, null, 2)}

Insights and Recommendations:`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: "You are a helpful assistant that analyzes CRM data and provides actionable insights." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error('Error generating insights:', error);
    return 'Error generating insights: ' + error.message;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Starting CRM Report Analysis');
  
  try {
    // Parse the report
    const reportPath = path.join(__dirname, 'test-data', 'crm-report-april-2025.txt');
    const sources = parseCRMReport(reportPath);
    
    // Generate summary statistics
    const summary = {
      totalSources: sources.length,
      totalLeads: sources.reduce((sum, source) => sum + source.total, 0),
      totalSold: sources.reduce((sum, source) => sum + source.sold, 0),
      overallConversionRate: sources.reduce((sum, source) => sum + source.conversionRate, 0) / sources.length,
      topPerformingSources: [...sources]
        .sort((a, b) => b.conversionRate - a.conversionRate)
        .slice(0, 3)
        .map(s => ({
          name: s.name,
          conversionRate: s.conversionRate,
          sold: s.sold,
          total: s.total
        }))
    };
    
    console.log('\n📊 Report Summary:');
    console.log('----------------');
    console.log(`Total Lead Sources: ${summary.totalSources}`);
    console.log(`Total Leads: ${summary.totalLeads}`);
    console.log(`Total Sold: ${summary.totalSold}`);
    console.log(`Overall Conversion Rate: ${summary.overallConversionRate.toFixed(2)}%`);
    
    console.log('\n🏆 Top Performing Sources:');
    summary.topPerformingSources.forEach((source, index) => {
      console.log(`${index + 1}. ${source.name}: ${source.conversionRate}% (${source.sold}/${source.total})`);
    });
    
    // Generate AI insights
    console.log('\n🤖 Generating AI-powered insights...');
    const insights = await generateInsights({
      summary,
      sources: sources.map(s => ({
        name: s.name,
        conversionRate: s.conversionRate,
        total: s.total,
        sold: s.sold,
        customerCount: s.customers.length
      }))
    });
    
    console.log('\n💡 Insights and Recommendations:');
    console.log('-------------------------------');
    console.log(insights);
    
    // Save results
    const resultsDir = path.join(__dirname, 'results');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }
    
    const outputPath = path.join(resultsDir, `crm-analysis-${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      summary,
      insights
    }, null, 2));
    
    console.log(`\n✅ Analysis complete! Results saved to: ${outputPath}`);
    
  } catch (error) {
    console.error('❌ Error analyzing CRM report:', error);
    process.exit(1);
  }
}

// Run the analysis
main();
