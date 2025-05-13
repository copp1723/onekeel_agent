/**
 * Script to merge OpenAPI files
 *
 * This script merges the main OpenAPI file with the workflow, auth, and job endpoints.
 */
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the main OpenAPI file
const mainFile = fs.readFileSync(path.join(__dirname, 'openapi.yaml'), 'utf8');
const mainDoc = yaml.load(mainFile);

// Read the workflow endpoints
const workflowFile = fs.readFileSync(path.join(__dirname, 'openapi-workflows.yaml'), 'utf8');
const workflowDoc = yaml.load(workflowFile);

// Read the auth endpoints
const authFile = fs.readFileSync(path.join(__dirname, 'openapi-auth.yaml'), 'utf8');
const authDoc = yaml.load(authFile);

// Read the job endpoints
const jobFile = fs.readFileSync(path.join(__dirname, 'openapi-jobs.yaml'), 'utf8');
const jobDoc = yaml.load(jobFile);

// Read the credentials endpoints
const credentialsFile = fs.readFileSync(path.join(__dirname, 'openapi-credentials.yaml'), 'utf8');
const credentialsDoc = yaml.load(credentialsFile);

// Merge the paths
Object.assign(mainDoc.paths, workflowDoc);
Object.assign(mainDoc.paths, authDoc);
Object.assign(mainDoc.paths, jobDoc);
Object.assign(mainDoc.paths, credentialsDoc);

// Write the merged file
fs.writeFileSync(
  path.join(__dirname, 'openapi-merged.yaml'),
  yaml.dump(mainDoc, { lineWidth: 120 })
);

console.log('OpenAPI files merged successfully!');
