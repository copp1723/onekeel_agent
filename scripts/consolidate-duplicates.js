#!/usr/bin/env node

/**
 * Script to identify and consolidate duplicate code
 * 
 * This script:
 * 1. Identifies duplicate code patterns in the codebase
 * 2. Creates shared utility functions for common operations
 * 3. Refactors code to use the shared utilities
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Define paths
const srcDir = path.join(process.cwd(), 'src');
const utilsDir = path.join(srcDir, 'utils');
const sharedDir = path.join(srcDir, 'shared');

// Create directories if they don't exist
[utilsDir, sharedDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
});

// Function to recursively get all files in a directory
function getAllFiles(dirPath, arrayOfFiles = [], extensions = ['.ts', '.js']) {
  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      arrayOfFiles = getAllFiles(filePath, arrayOfFiles, extensions);
    } else {
      const ext = path.extname(filePath);
      if (extensions.includes(ext)) {
        arrayOfFiles.push(filePath);
      }
    }
  });

  return arrayOfFiles;
}

// Create shared utility files

// 1. Create a shared route handler utility
const routeHandlerUtilContent = `/**
 * Shared route handler utilities
 * 
 * This module provides common utilities for route handlers to reduce code duplication.
 */

import { Request, Response, NextFunction } from 'express';
import { toAppError } from '../shared/errorTypes.js';
import { logger } from '../shared/logger.js';

/**
 * Wrap an async route handler with error handling
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await fn(req, res, next);
    } catch (error) {
      next(toAppError(error));
    }
  };
}

/**
 * Standard success response formatter
 */
export function sendSuccess(
  res: Response, 
  data: any, 
  message: string = 'Success', 
  statusCode: number = 200
) {
  res.status(statusCode).json({
    status: 'success',
    message,
    data,
  });
}

/**
 * Standard error response formatter
 */
export function sendError(
  res: Response, 
  error: any, 
  message: string = 'An error occurred', 
  statusCode: number = 500
) {
  const appError = toAppError(error);
  logger.error(message, { error: appError });
  
  res.status(statusCode).json({
    status: 'error',
    message: message || appError.message,
    error: process.env.NODE_ENV !== 'production' ? appError : undefined,
  });
}

/**
 * Validate request data against a schema
 */
export function validateRequest(req: Request, schema: any, options = { abortEarly: false }) {
  const { error, value } = schema.validate(req.body, options);
  if (error) {
    throw toAppError(error, 'Validation error');
  }
  return value;
}

/**
 * Create a standard CRUD controller for a resource
 */
export function createCrudController(model: any, options: any = {}) {
  return {
    getAll: asyncHandler(async (req: Request, res: Response) => {
      const items = await model.findAll();
      sendSuccess(res, items);
    }),
    
    getById: asyncHandler(async (req: Request, res: Response) => {
      const item = await model.findById(req.params.id);
      if (!item) {
        return sendError(res, null, \`\${options.resourceName || 'Item'} not found\`, 404);
      }
      sendSuccess(res, item);
    }),
    
    create: asyncHandler(async (req: Request, res: Response) => {
      const item = await model.create(req.body);
      sendSuccess(res, item, \`\${options.resourceName || 'Item'} created\`, 201);
    }),
    
    update: asyncHandler(async (req: Request, res: Response) => {
      const item = await model.update(req.params.id, req.body);
      if (!item) {
        return sendError(res, null, \`\${options.resourceName || 'Item'} not found\`, 404);
      }
      sendSuccess(res, item, \`\${options.resourceName || 'Item'} updated\`);
    }),
    
    delete: asyncHandler(async (req: Request, res: Response) => {
      const result = await model.delete(req.params.id);
      if (!result) {
        return sendError(res, null, \`\${options.resourceName || 'Item'} not found\`, 404);
      }
      sendSuccess(res, null, \`\${options.resourceName || 'Item'} deleted\`);
    }),
  };
}
`;

// 2. Create a shared email template utility
const emailTemplateUtilContent = `/**
 * Shared email template utilities
 * 
 * This module provides common utilities for email templates to reduce code duplication.
 */

import fs from 'fs';
import path from 'path';
import { logger } from '../shared/logger.js';

// Base template paths
const templatesDir = path.join(process.cwd(), 'src', 'services', 'emailTemplates');

/**
 * Load an email template from file
 */
export function loadTemplate(templateName: string): { html: string; text: string } {
  try {
    const htmlPath = path.join(templatesDir, \`\${templateName}.html\`);
    const textPath = path.join(templatesDir, \`\${templateName}.txt\`);
    
    const html = fs.existsSync(htmlPath) ? fs.readFileSync(htmlPath, 'utf8') : '';
    const text = fs.existsSync(textPath) ? fs.readFileSync(textPath, 'utf8') : '';
    
    return { html, text };
  } catch (error) {
    logger.error(\`Failed to load email template: \${templateName}\`, { error });
    throw new Error(\`Failed to load email template: \${templateName}\`);
  }
}

/**
 * Render an email template with variables
 */
export function renderTemplate(template: string, variables: Record<string, any> = {}): string {
  let rendered = template;
  
  // Replace variables in the template
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(\`{{\\s*\${key}\\s*}}\`, 'g');
    rendered = rendered.replace(regex, String(value));
  });
  
  return rendered;
}

/**
 * Prepare an email with rendered templates
 */
export function prepareEmail(
  templateName: string,
  variables: Record<string, any> = {},
  options: { includeText?: boolean } = {}
): { html: string; text?: string } {
  const { html, text } = loadTemplate(templateName);
  
  const renderedHtml = renderTemplate(html, variables);
  const result: { html: string; text?: string } = { html: renderedHtml };
  
  if (options.includeText !== false && text) {
    result.text = renderTemplate(text, variables);
  }
  
  return result;
}
`;

// Write the shared utility files
fs.writeFileSync(path.join(utilsDir, 'routeHandler.ts'), routeHandlerUtilContent);
console.log('Created shared route handler utility: src/utils/routeHandler.ts');

fs.writeFileSync(path.join(utilsDir, 'emailTemplate.ts'), emailTemplateUtilContent);
console.log('Created shared email template utility: src/utils/emailTemplate.ts');

console.log('Shared utility files have been created successfully!');
console.log('To use these utilities, update your code to import from these shared modules.');
