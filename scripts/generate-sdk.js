#!/usr/bin/env node

/**
 * TypeScript SDK Generator
 * 
 * This script generates a TypeScript client SDK from the OpenAPI specification.
 * It uses the OpenAPI Generator to create a TypeScript client that can be used
 * to interact with the API.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import YAML from 'yamljs';

// Configuration
const OPENAPI_SPEC_PATH = path.resolve(process.cwd(), 'docs/openapi/openapi.yaml');
const OUTPUT_DIR = path.resolve(process.cwd(), 'src/client-sdk');
const GENERATOR = 'typescript-axios';
const PACKAGE_NAME = 'agentflow-client';

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

console.log(`Generating TypeScript SDK for API version ${apiVersion}...`);

try {
  // Run OpenAPI Generator
  execSync(
    `npx @openapitools/openapi-generator-cli generate \
    -i ${OPENAPI_SPEC_PATH} \
    -g ${GENERATOR} \
    -o ${OUTPUT_DIR} \
    --additional-properties=npmName=${PACKAGE_NAME},npmVersion=${apiVersion},supportsES6=true,withSeparateModelsAndApi=true,modelPropertyNaming=original`,
    { stdio: 'inherit' }
  );

  console.log(`TypeScript SDK generated successfully at ${OUTPUT_DIR}`);

  // Create a README.md file for the SDK
  const readmePath = path.join(OUTPUT_DIR, 'README.md');
  const readmeContent = `# AgentFlow TypeScript Client SDK

This TypeScript client SDK provides a convenient way to interact with the AgentFlow API.

## Installation

\`\`\`bash
npm install ${PACKAGE_NAME}
\`\`\`

## Usage

\`\`\`typescript
import { Configuration, TasksApi } from '${PACKAGE_NAME}';

// Create a configuration with your API key or other authentication
const config = new Configuration({
  basePath: 'http://localhost:5000',
  // Add authentication if needed
});

// Create an instance of the API client
const tasksApi = new TasksApi(config);

// Submit a new task
async function submitTask() {
  try {
    const response = await tasksApi.submitTask({
      task: "Crawl https://news.ycombinator.com and extract the title, url, and score of the top 5 posts"
    });
    console.log('Task submitted:', response.data);
  } catch (error) {
    console.error('Error submitting task:', error);
  }
}

// Get task status
async function getTaskStatus(taskId) {
  try {
    const response = await tasksApi.getTaskStatus(taskId);
    console.log('Task status:', response.data);
  } catch (error) {
    console.error('Error getting task status:', error);
  }
}
\`\`\`

## API Documentation

For detailed API documentation, refer to the [API Documentation](/api-docs).

## License

This SDK is licensed under the MIT License.
`;

  fs.writeFileSync(readmePath, readmeContent);
  console.log(`SDK README.md created at ${readmePath}`);

  // Add the SDK to package.json
  const packageJsonPath = path.resolve(process.cwd(), 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // Add script to generate SDK
    packageJson.scripts = packageJson.scripts || {};
    packageJson.scripts['generate-sdk'] = 'node scripts/generate-sdk.js';
    
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log('Added generate-sdk script to package.json');
  }

} catch (error) {
  console.error('Error generating TypeScript SDK:', error);
  process.exit(1);
}
