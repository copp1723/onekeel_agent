/**
 * Swagger UI middleware for API documentation
 * 
 * This middleware serves the Swagger UI for the OpenAPI documentation.
 */
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Initialize Swagger UI middleware
 * 
 * @param app Express application
 */
export function setupSwagger(app: express.Express): void {
  try {
    // Path to the OpenAPI specification file
    const openApiPath = path.resolve(__dirname, '../../../docs/openapi/openapi.yaml');
    
    // Check if the file exists
    if (!fs.existsSync(openApiPath)) {
      console.error(`OpenAPI specification file not found at ${openApiPath}`);
      return;
    }
    
    // Load the OpenAPI specification
    const swaggerDocument = YAML.load(openApiPath);
    
    // Set up Swagger UI
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
      explorer: true,
      customCss: '.swagger-ui .topbar { display: none }',
      swaggerOptions: {
        docExpansion: 'list',
        filter: true,
        showRequestDuration: true,
      },
    }));
    
    console.log('Swagger UI initialized at /api-docs');
  } catch (error) {
    console.error('Failed to initialize Swagger UI:', error);
  }
}
