/**
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
    const htmlPath = path.join(templatesDir, `${templateName}.html`);
    const textPath = path.join(templatesDir, `${templateName}.txt`);
    
    const html = fs.existsSync(htmlPath) ? fs.readFileSync(htmlPath, 'utf8') : '';
    const text = fs.existsSync(textPath) ? fs.readFileSync(textPath, 'utf8') : '';
    
    return { html, text };
  } catch (error) {
    logger.error(`Failed to load email template: ${templateName}`, { error });
    throw new Error(`Failed to load email template: ${templateName}`);
  }
}

/**
 * Render an email template with variables
 */
export function renderTemplate(template: string, variables: Record<string, any> = {}): string {
  let rendered = template;
  
  // Replace variables in the template
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{\s*${key}\s*}}`, 'g');
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
