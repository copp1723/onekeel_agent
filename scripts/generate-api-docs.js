#!/usr/bin/env node

/**
 * API Documentation Generator
 * 
 * This script generates API documentation from the OpenAPI specification.
 * It can also deploy the documentation to a static site hosting service.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import YAML from 'yamljs';

// Configuration
const OPENAPI_SPEC_PATH = path.resolve(process.cwd(), 'docs/openapi/openapi.yaml');
const OUTPUT_DIR = path.resolve(process.cwd(), 'docs/api');
const REDOC_OUTPUT = path.join(OUTPUT_DIR, 'index.html');

// Ensure the OpenAPI specification exists
if (!fs.existsSync(OPENAPI_SPEC_PATH)) {
  console.error(`OpenAPI specification not found at ${OPENAPI_SPEC_PATH}`);
  process.exit(1);
}

// Create output directory if it doesn't exist
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Load the OpenAPI specification to get the version
const openApiSpec = YAML.load(OPENAPI_SPEC_PATH);
const apiVersion = openApiSpec.info.version || '1.0.0';

console.log(`Generating API documentation for version ${apiVersion}...`);

try {
  // Generate ReDoc HTML documentation
  console.log('Generating ReDoc HTML documentation...');
  execSync(
    `npx redoc-cli bundle ${OPENAPI_SPEC_PATH} -o ${REDOC_OUTPUT}`,
    { stdio: 'inherit' }
  );
  console.log(`ReDoc HTML documentation generated at ${REDOC_OUTPUT}`);

  // Copy the OpenAPI specification to the output directory
  const outputSpecPath = path.join(OUTPUT_DIR, 'openapi.yaml');
  fs.copyFileSync(OPENAPI_SPEC_PATH, outputSpecPath);
  console.log(`OpenAPI specification copied to ${outputSpecPath}`);

  // Generate a JSON version of the OpenAPI specification
  const jsonSpecPath = path.join(OUTPUT_DIR, 'openapi.json');
  const jsonSpec = JSON.stringify(openApiSpec, null, 2);
  fs.writeFileSync(jsonSpecPath, jsonSpec);
  console.log(`JSON OpenAPI specification generated at ${jsonSpecPath}`);

  console.log('API documentation generation completed successfully!');
  console.log(`Documentation is available at ${REDOC_OUTPUT}`);
} catch (error) {
  console.error('Error generating API documentation:', error);
  process.exit(1);
}
