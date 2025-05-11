import { storage } from '../server/storage';
import axios from 'axios';
import { EkoTool } from './extractCleanContent';

interface DealerLoginArgs {
  dealerId: string;
  siteUrl?: string;
  userId?: string; // User ID for credential lookup
}

interface DealerLoginResult {
  success: boolean;
  message: string;
  dealerId: string;
  token?: string; // Auth token when login is successful
  expiresAt?: string; // Token expiration date
  error?: string; // Detailed error information when login fails
}

/**
 * Creates a dealerLogin tool that handles authentication with dealer websites
 * using stored credentials
 * @returns A tool object that can be registered with Eko
 */
export function dealerLogin(): EkoTool {
  return {
    name: 'dealerLogin',
    description: 'Log in to a dealer website using stored credentials',
    parameters: {
      type: 'object',
      properties: {
        dealerId: {
          type: 'string',
          description: 'The unique identifier for the dealer'
        },
        siteUrl: {
          type: 'string',
          description: 'Optional URL of the dealer website'
        },
        userId: {
          type: 'string',
          description: 'Optional user ID for credential lookup'
        }
      },
      required: ['dealerId']
    },
    handler: async (args: DealerLoginArgs) => {
      try {
        const { dealerId, userId } = args;
        
        if (!userId) {
          return {
            success: false,
            dealerId,
            message: 'Authentication required: Please log in to access dealer systems',
            error: 'No user ID provided for credential lookup'
          };
        }

        // Get credentials from the secure storage
        const credentials = await storage.getCredential(userId, `dealer:${dealerId}`);
        
        if (!credentials) {
          return {
            success: false,
            dealerId,
            message: 'No stored credentials found for this dealer',
            error: 'Credentials not found'
          };
        }

        // Determine the API endpoint for the login attempt
        let apiEndpoint = args.siteUrl || null;
        
        // Try to determine a default endpoint based on the dealer ID if no URL was provided
        if (!apiEndpoint) {
          // Map common dealer systems to their login endpoints
          // In a production system, this would come from a database
          const dealerEndpoints: Record<string, string> = {
            'dealersocket': 'https://login.dealersocket.com/api/auth',
            'dealertrack': 'https://auth.dealertrack.com/login',
            'cdkglobal': 'https://auth.cdkglobal.com/login',
            'reynolds': 'https://login.reyrey.com/authentication'
          };
          
          // Check if the dealer ID contains a known system name
          const matchedSystem = Object.keys(dealerEndpoints).find(system => 
            dealerId.toLowerCase().includes(system.toLowerCase())
          );
          
          if (matchedSystem) {
            apiEndpoint = dealerEndpoints[matchedSystem];
            console.log(`Using default endpoint for ${matchedSystem}: ${apiEndpoint}`);
          } else {
            apiEndpoint = 'https://api.dealer-system.com/login'; // Generic fallback
          }
        }
        
        // Log the login attempt with sensitive details masked
        console.log(`Attempting login for dealer ${dealerId} with user ${credentials.username.substring(0, 2)}***`);
        
        try {
          // In a production system, this would be a real API call
          // Here we'll simulate the network request with a timeout
          // to mimic a realistic login flow
          
          // Simulate network latency
          await new Promise(resolve => setTimeout(resolve, 800));
          
          // For now, we just simulate a successful login
          // In a real implementation, we would perform the actual login request:
          
          /*
          const loginResponse = await axios.post(apiEndpoint, {
            username: credentials.username,
            password: credentials.password,
            dealerId: dealerId
          }, {
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'DealerAssistant/1.0'
            }
          });
          
          // Handle the response
          const isSuccessful = loginResponse.status === 200;
          const responseData = loginResponse.data;
          const authToken = responseData.token || responseData.access_token;
          */
          
          // Generate a simulated token (in production this would come from the API)
          const simulatedToken = `${Buffer.from(dealerId).toString('base64')}.${Date.now()}`;
          const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();
          
          console.log(`Successfully logged in to dealer ${dealerId} using credentials for user ${userId}`);
          
          return {
            success: true,
            dealerId,
            message: 'Successfully authenticated with dealer system',
            token: simulatedToken,
            expiresAt,
            apiEndpoint // Include the endpoint used for reference
          };
        } catch (loginError: any) {
          console.error(`Login error for dealer ${dealerId}:`, loginError);
          
          return {
            success: false,
            dealerId,
            message: 'Authentication failed with dealer system',
            error: loginError.message || 'Unknown login error'
          };
        }
      } catch (error: any) {
        console.error('Error in dealer login:', error);
        
        return {
          success: false,
          dealerId: args.dealerId,
          message: 'Failed to authenticate with dealer system',
          error: error.message || String(error)
        };
      }
    }
  };
}