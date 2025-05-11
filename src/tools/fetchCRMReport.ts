import { storage } from '../server/storage';
import axios from 'axios';
import { EkoTool } from './extractCleanContent';

interface FetchCRMReportArgs {
  site: string;
  dealerId?: string;
  userId?: string; // User ID for credential lookup
  date?: string; // Optional date to retrieve report for (defaults to yesterday)
}

interface DealRecord {
  saleDate: string;
  repName: string;
  vehicle: string;
  price: number;
  grossProfit: number;
  vin: string;
  source?: string;
  notes?: string;
}

interface CRMReportResult {
  success: boolean;
  message: string;
  dealerId?: string;
  dealerName?: string;
  reportDate?: string;
  deals?: DealRecord[];
  summaryStats?: {
    totalSales: number;
    totalRevenue: number;
    totalGrossProfit: number;
    topRep?: string;
  };
  error?: string;
}

/**
 * Creates a fetchCRMReport tool that simulates retrieving a sales report from a dealer CRM
 * @returns A tool object that can be registered with Eko
 */
export function fetchCRMReport(): EkoTool {
  return {
    name: 'fetchCRMReport',
    description: 'Retrieve a sales report from a dealer CRM system',
    parameters: {
      type: 'object',
      properties: {
        site: {
          type: 'string',
          description: 'The CRM site to fetch the report from (e.g., vinsolutions, dealersocket)'
        },
        dealerId: {
          type: 'string',
          description: 'Optional unique identifier for the dealer'
        },
        userId: {
          type: 'string',
          description: 'User ID for credential lookup'
        },
        date: {
          type: 'string',
          description: 'Optional date to retrieve report for (YYYY-MM-DD format)'
        }
      },
      required: ['site']
    },
    handler: async (args: FetchCRMReportArgs) => {
      try {
        const { site, userId, dealerId = 'unknown' } = args;
        
        // Default to yesterday's date if not specified
        const reportDate = args.date || getYesterdayDate();
        
        // Verify we have a user ID for credential lookup
        if (!userId) {
          return {
            success: false,
            message: 'Authentication required: Please log in to access CRM data',
            error: 'No user ID provided for credential lookup'
          };
        }

        // Prepare site key for credential lookup - normalize to lowercase
        const normalizedSite = site.toLowerCase();
        const siteKey = normalizedSite.startsWith('dealer:') ? normalizedSite : `dealer:${normalizedSite}`;
        
        console.log(`Looking up credentials for site: ${siteKey}`);
        
        // Get credentials from secure storage
        const credentials = await storage.getCredential(userId, siteKey);
        
        if (!credentials) {
          // If no credentials found with the formatted key, try with just the site name
          const fallbackCredentials = await storage.getCredential(userId, site);
          
          if (!fallbackCredentials) {
            return {
              success: false,
              message: `No stored credentials found for ${site}`,
              error: 'Credentials not found. Please store your CRM credentials first.'
            };
          }
        }
        
        console.log(`Found credentials for ${site}, proceeding with report fetch`);
        
        // In a real implementation, we would call the actual CRM API here
        // For example:
        /*
        const apiEndpoint = getCRMApiEndpoint(site);
        const reportResponse = await axios.post(
          `${apiEndpoint}/reports/dailySales`, 
          { date: reportDate },
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
        const reportData = reportResponse.data;
        */
        
        // Simulate API latency
        await new Promise(resolve => setTimeout(resolve, 1200));
        
        // This is a SIMULATION ONLY - in production, we would fetch actual data
        // Return structure-only data with clear PLACEHOLDER values
        // When credentials are available, this would be replaced with real API calls
        
        // Fetch report data
        const reportData = await getStructuredReportData(site, reportDate);
        
        // Calculate summary stats
        const summaryStats = calculateSummaryStats(reportData);
        
        return {
          success: true,
          message: `Successfully retrieved sales report from ${site} for ${reportDate}`,
          dealerId,
          dealerName: getDealerName(site),
          reportDate,
          deals: reportData,
          summaryStats
        };
      } catch (error: any) {
        console.error('Error fetching CRM report:', error);
        
        return {
          success: false,
          message: 'Failed to retrieve CRM report',
          error: error.message || String(error)
        };
      }
    }
  };
}

/**
 * Get yesterday's date in YYYY-MM-DD format
 */
function getYesterdayDate(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split('T')[0];
}

/**
 * Get a friendly dealer name based on the site
 */
function getDealerName(site: string): string {
  const siteMap: Record<string, string> = {
    'vinsolutions': 'VinSolutions CRM',
    'dealersocket': 'DealerSocket CRM',
    'elead': 'eLead CRM',
    'cdk': 'CDK Global'
  };
  
  const normalizedSite = site.toLowerCase();
  
  for (const [key, value] of Object.entries(siteMap)) {
    if (normalizedSite.includes(key)) {
      return value;
    }
  }
  
  return 'Dealer CRM';
}

/**
 * Get structured report data for testing
 * In production, this would be replaced with actual API calls
 */
async function getStructuredReportData(site: string, date: string): Promise<DealRecord[]> {
  // IMPORTANT: This function returns STRUCTURE ONLY with placeholder values
  // It's designed to be replaced with real API calls in production
  
  // Define structural placeholders (not realistic data)
  const structuralData: DealRecord[] = [
    {
      saleDate: date,
      repName: "PLACEHOLDER_REP_1",
      vehicle: "PLACEHOLDER_VEHICLE_1",
      price: 0,
      grossProfit: 0,
      vin: "PLACEHOLDER_VIN_1"
    },
    {
      saleDate: date,
      repName: "PLACEHOLDER_REP_2",
      vehicle: "PLACEHOLDER_VEHICLE_2",
      price: 0,
      grossProfit: 0,
      vin: "PLACEHOLDER_VIN_2"
    }
  ];
  
  return structuralData;
}

/**
 * Calculate summary statistics from report data
 */
function calculateSummaryStats(deals: DealRecord[]) {
  // Calculate basic stats
  const totalSales = deals.length;
  const totalRevenue = deals.reduce((sum, deal) => sum + deal.price, 0);
  const totalGrossProfit = deals.reduce((sum, deal) => sum + deal.grossProfit, 0);
  
  // Find top rep (most sales)
  const repCounts: Record<string, number> = {};
  deals.forEach(deal => {
    repCounts[deal.repName] = (repCounts[deal.repName] || 0) + 1;
  });
  
  let topRep = '';
  let maxSales = 0;
  
  Object.entries(repCounts).forEach(([rep, count]) => {
    if (count > maxSales) {
      maxSales = count;
      topRep = rep;
    }
  });
  
  return {
    totalSales,
    totalRevenue,
    totalGrossProfit,
    topRep: topRep || undefined
  };
}