/**
 * Mailer Service
 * Handles email sending operations using SendGrid
 */

import sgMail from '@sendgrid/mail';

// Service state
let initialized = false;

// Default sender (must be verified with SendGrid)
let defaultSender = 'no-reply@example.com';

/**
 * Initialize the mailer service with API key
 * @param {object} options - Configuration options
 * @returns {boolean} True if initialization was successful
 */
export function initialize(options = {}) {
  // Check if SendGrid API key is available
  const apiKey = process.env.SENDGRID_API_KEY;
  
  if (!apiKey) {
    console.warn('SendGrid API key not found. Email sending will not be available.');
    return false;
  }
  
  try {
    // Set API key
    sgMail.setApiKey(apiKey);
    
    // Set default sender if provided
    if (options.defaultSender) {
      defaultSender = options.defaultSender;
    }
    
    console.log('SendGrid mailer service initialized successfully');
    initialized = true;
    return true;
  } catch (error) {
    console.error('Error initializing SendGrid:', error);
    return false;
  }
}

/**
 * Send email using SendGrid
 * @param {object} params - Email parameters
 * @param {string} params.to - Recipient email address
 * @param {string} params.subject - Email subject
 * @param {string} params.text - Plain text content
 * @param {string} params.html - HTML content
 * @param {string} params.from - Sender email (optional, defaults to system default)
 * @returns {Promise<object>} Result of the sending operation
 */
export async function sendEmail(params) {
  // Check if service is initialized
  if (!initialized) {
    initialize();
    
    if (!initialized) {
      return { 
        success: false, 
        error: 'Mailer service not initialized' 
      };
    }
  }
  
  // Validate required parameters
  if (!params.to) {
    return { 
      success: false, 
      error: 'Recipient email address is required' 
    };
  }
  
  if (!params.subject) {
    return { 
      success: false, 
      error: 'Email subject is required' 
    };
  }
  
  if (!params.text && !params.html) {
    return { 
      success: false, 
      error: 'Email content (text or HTML) is required' 
    };
  }
  
  try {
    // Create email message
    const msg = {
      to: params.to,
      from: params.from || defaultSender,
      subject: params.subject,
      text: params.text || '', // Plain text fallback
      html: params.html || params.text || '', // HTML content with text fallback
    };
    
    // Send the email
    await sgMail.send(msg);
    
    return { 
      success: true, 
      message: 'Email sent successfully' 
    };
  } catch (error) {
    console.error('SendGrid error:', error);
    
    // Extract useful information from the error
    const errorInfo = error.response ? {
      status: error.response.status,
      body: error.response.body
    } : error.message || 'Unknown error';
    
    return { 
      success: false, 
      error: `Failed to send email: ${JSON.stringify(errorInfo)}` 
    };
  }
}

/**
 * Set the default sender email address
 * @param {string} email - Sender email address
 */
export function setDefaultSender(email) {
  if (email && typeof email === 'string') {
    defaultSender = email;
    return true;
  }
  return false;
}

/**
 * Check if the mailer service is configured
 * @returns {boolean} True if the service is configured
 */
export function isConfigured() {
  return initialized;
}

// Initialize on module load if API key is available
initialize();