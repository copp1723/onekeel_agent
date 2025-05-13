/**
 * Multi-Vendor Email Ingestion Service
 * 
 * This service handles fetching and processing emails from multiple CRM vendors
 * with configurable pattern matching and extraction strategies.
 */

import fs from 'fs';
import path from 'path';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { v4 as uuidv4 } from 'uuid';
import { parse as csvParse } from 'csv-parse/sync';
import ExcelJS from 'exceljs';
import { parse as parsePdf } from 'pdf-parse';

// Sample vendor data for testing
const sampleVendorData = {
  VinSolutions: {
    records: [
      { Date: '2025-05-13', Customer: 'Customer A', Vehicle: 'Honda Accord', Status: 'New Lead', Price: 32500, DaysOnLot: 15, LeadSource: 'Website', SalesPerson: 'Rep 1' },
      { Date: '2025-05-13', Customer: 'Customer B', Vehicle: 'Toyota Camry', Status: 'Test Drive', Price: 29800, DaysOnLot: 22, LeadSource: 'Phone', SalesPerson: 'Rep 2' },
      { Date: '2025-05-13', Customer: 'Customer C', Vehicle: 'Ford F-150', Status: 'Negotiation', Price: 45600, DaysOnLot: 8, LeadSource: 'Walk-in', SalesPerson: 'Rep 3' },
      { Date: '2025-05-13', Customer: 'Customer D', Vehicle: 'Chevrolet Tahoe', Status: 'Purchased', Price: 52300, DaysOnLot: 30, LeadSource: 'Referral', SalesPerson: 'Rep 1' },
      { Date: '2025-05-13', Customer: 'Customer E', Vehicle: 'Nissan Altima', Status: 'New Lead', Price: 26400, DaysOnLot: 12, LeadSource: 'Website', SalesPerson: 'Rep 4' }
    ]
  },
  VAUTO: {
    records: [
      { 'Report Date': '2025-05-13', 'Stock#': 'A123', 'VIN': '1HGCM82633A123456', 'Make': 'Honda', 'Model': 'Accord', 'Price': 32500, 'Cost': 29500, 'Age': 15, 'Category': 'Sedan', 'Source': 'Auction' },
      { 'Report Date': '2025-05-13', 'Stock#': 'B234', 'VIN': '2T1BU4EE2AC123456', 'Make': 'Toyota', 'Model': 'Camry', 'Price': 29800, 'Cost': 27000, 'Age': 22, 'Category': 'Sedan', 'Source': 'Trade-in' },
      { 'Report Date': '2025-05-13', 'Stock#': 'C345', 'VIN': '1FTEX1EM5EF123456', 'Make': 'Ford', 'Model': 'F-150', 'Price': 45600, 'Cost': 41200, 'Age': 8, 'Category': 'Truck', 'Source': 'Dealer Transfer' },
      { 'Report Date': '2025-05-13', 'Stock#': 'D456', 'VIN': '3GNFK16Z23G123456', 'Make': 'Chevrolet', 'Model': 'Tahoe', 'Price': 52300, 'Cost': 47800, 'Age': 30, 'Category': 'SUV', 'Source': 'Auction' },
      { 'Report Date': '2025-05-13', 'Stock#': 'E567', 'VIN': '1N4AL3AP8DN123456', 'Make': 'Nissan', 'Model': 'Altima', 'Price': 26400, 'Cost': 23500, 'Age': 12, 'Category': 'Sedan', 'Source': 'Trade-in' }
    ]
  },
  DealerTrack: {
    records: [
      { 'Transaction Date': '2025-05-13', 'Deal #': 'DT123', 'Customer Name': 'Customer A', 'Vehicle': 'Honda Accord', 'Amount': 32500, 'Term': 60, 'Rate': 3.9, 'Product': 'Finance', 'Type': 'New' },
      { 'Transaction Date': '2025-05-13', 'Deal #': 'DT234', 'Customer Name': 'Customer B', 'Vehicle': 'Toyota Camry', 'Amount': 29800, 'Term': 72, 'Rate': 4.2, 'Product': 'Lease', 'Type': 'New' },
      { 'Transaction Date': '2025-05-13', 'Deal #': 'DT345', 'Customer Name': 'Customer C', 'Vehicle': 'Ford F-150', 'Amount': 45600, 'Term': 60, 'Rate': 3.5, 'Product': 'Finance', 'Type': 'Used' },
      { 'Transaction Date': '2025-05-13', 'Deal #': 'DT456', 'Customer Name': 'Customer D', 'Vehicle': 'Chevrolet Tahoe', 'Amount': 52300, 'Term': 48, 'Rate': 2.9, 'Product': 'Finance', 'Type': 'New' },
      { 'Transaction Date': '2025-05-13', 'Deal #': 'DT567', 'Customer Name': 'Customer E', 'Vehicle': 'Nissan Altima', 'Amount': 26400, 'Term': 72, 'Rate': 4.5, 'Product': 'Lease', 'Type': 'New' }
    ]
  }
};

/**
 * Default vendor configurations
 */
const defaultVendorConfigs = {
  VinSolutions: {
    emailPatterns: {
      fromAddresses: ['reports@vinsolutions.com', 'no-reply@vinsolutions.com'],
      subjectPatterns: ['Daily Report', 'Weekly Summary', 'Monthly Analytics'],
      attachmentTypes: ['csv', 'xlsx']
    },
    extractorConfig: {
      type: 'csv',
      dateColumn: 'Date',
      keyColumns: ['Customer', 'Vehicle', 'Status'],
      numericalColumns: ['Price', 'DaysOnLot'],
      categoryColumns: ['LeadSource', 'SalesPerson']
    }
  },
  VAUTO: {
    emailPatterns: {
      fromAddresses: ['reports@vauto.com', 'analytics@vauto.com'],
      subjectPatterns: ['Inventory Report', 'Pricing Analysis'],
      attachmentTypes: ['xlsx', 'pdf']
    },
    extractorConfig: {
      type: 'excel',
      sheets: ['Summary', 'Detail'],
      dateColumn: 'Report Date',
      keyColumns: ['Stock#', 'VIN', 'Make', 'Model'],
      numericalColumns: ['Price', 'Cost', 'Age'],
      categoryColumns: ['Category', 'Source']
    }
  },
  DealerTrack: {
    emailPatterns: {
      fromAddresses: ['reports@dealertrack.com', 'noreply@dealertrack.com'],
      subjectPatterns: ['F&I Report', 'Finance Summary', 'Daily Transactions'],
      attachmentTypes: ['xlsx', 'pdf', 'csv']
    },
    extractorConfig: {
      type: 'csv',
      dateColumn: 'Transaction Date',
      keyColumns: ['Deal #', 'Customer Name', 'Vehicle'],
      numericalColumns: ['Amount', 'Term', 'Rate'],
      categoryColumns: ['Product', 'Type']
    }
  }
};

/**
 * Check emails from all configured vendors
 */
async function checkEmailsFromAllVendors() {
  try {
    console.log('Checking emails from all configured vendors...');
    
    // Load configuration
    const config = await loadVendorConfig();
    const vendors = Object.keys(config.vendors || {});
    
    if (vendors.length === 0) {
      console.log('No vendors configured');
      return { success: false, message: 'No vendors configured', processedReports: [] };
    }
    
    console.log(`Found ${vendors.length} configured vendors: ${vendors.join(', ')}`);
    
    // If using sample data, skip actual email checking
    if (process.env.USE_SAMPLE_DATA === 'true') {
      console.log('Using sample data for testing');
      
      const results = {
        success: true,
        message: 'Sample data processed',
        totalProcessed: 0,
        processedReports: []
      };
      
      // Process each vendor with sample data
      for (const vendor of vendors) {
        if (sampleVendorData[vendor]) {
          const sampleResult = await createSampleReportData(vendor);
          results.processedReports.push({
            vendor,
            reportId: sampleResult.reportId,
            recordCount: sampleResult.recordCount,
            success: true
          });
          results.totalProcessed++;
        }
      }
      
      return results;
    }
    
    // Process emails for each vendor
    const allResults = await Promise.all(
      vendors.map(vendor => processVendorEmails(vendor, config.vendors[vendor]))
    );
    
    // Combine results
    const results = {
      success: true,
      message: 'Email processing completed',
      totalProcessed: allResults.reduce((sum, r) => sum + (r.processedReports?.length || 0), 0),
      processedReports: allResults.flatMap(r => r.processedReports || [])
    };
    
    return results;
  } catch (error) {
    console.error('Error checking emails from all vendors:', error);
    return { success: false, message: error.message, processedReports: [] };
  }
}

/**
 * Process emails for a specific vendor
 */
async function processVendorEmails(vendor, vendorConfig) {
  try {
    console.log(`Processing emails for vendor: ${vendor}`);
    
    if (!vendorConfig) {
      return { success: false, message: 'No vendor configuration found', processedReports: [] };
    }
    
    // Get email configuration from environment
    const emailConfig = getEmailConfig();
    
    if (!emailConfig.valid) {
      console.error('Invalid email configuration. Check environment variables.');
      return { success: false, message: 'Invalid email configuration', processedReports: [] };
    }
    
    // Connect to mailbox
    const client = new ImapFlow({
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure,
      auth: {
        user: emailConfig.user,
        pass: emailConfig.pass
      }
    });
    
    await client.connect();
    
    // Select the mailbox
    const lock = await client.getMailboxLock('INBOX');
    
    try {
      // Build search criteria
      const searchCriteria = buildSearchCriteria(vendorConfig.emailPatterns);
      
      // Search for matching emails
      const messages = await client.search(searchCriteria);
      
      console.log(`Found ${messages.length} matching emails for ${vendor}`);
      
      if (messages.length === 0) {
        return { success: true, message: 'No matching emails found', processedReports: [] };
      }
      
      // Process each matching email
      const processedReports = [];
      
      for (const message of messages) {
        const emailData = await fetchEmail(client, message.seq);
        
        if (!emailData) {
          console.log(`Failed to fetch email #${message.seq}`);
          continue;
        }
        
        // Process attachments
        for (const attachment of emailData.attachments) {
          const reportData = await processAttachment(attachment, vendorConfig.extractorConfig);
          
          if (reportData && reportData.success) {
            processedReports.push({
              vendor,
              messageId: emailData.messageId,
              subject: emailData.subject,
              reportId: reportData.reportId,
              recordCount: reportData.recordCount,
              success: true
            });
          }
        }
      }
      
      return { success: true, message: 'Emails processed', processedReports };
    } finally {
      // Always release the mailbox lock
      lock.release();
      await client.logout();
    }
  } catch (error) {
    console.error(`Error processing emails for vendor ${vendor}:`, error);
    return { success: false, message: error.message, processedReports: [] };
  }
}

/**
 * Build search criteria for IMAP search
 */
function buildSearchCriteria(emailPatterns) {
  const criteria = [];
  
  // Add sender criteria if specified
  if (emailPatterns.fromAddresses && emailPatterns.fromAddresses.length > 0) {
    const fromOr = emailPatterns.fromAddresses.map(from => ({ from }));
    criteria.push({ or: fromOr });
  }
  
  // Add subject criteria if specified
  if (emailPatterns.subjectPatterns && emailPatterns.subjectPatterns.length > 0) {
    const subjectOr = emailPatterns.subjectPatterns.map(subject => ({ subject }));
    criteria.push({ or: subjectOr });
  }
  
  // Search for unseen messages with attachments
  criteria.push({ unseen: true });
  criteria.push({ hasAttachment: true });
  
  // Default to last 30 days if no criteria specified
  if (criteria.length === 0) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    criteria.push({ since: thirtyDaysAgo });
  }
  
  return { and: criteria };
}

/**
 * Fetch the content of a single email
 */
async function fetchEmail(client, seq) {
  try {
    const message = await client.fetchOne(seq, { source: true });
    
    if (!message) {
      return null;
    }
    
    // Parse email content
    const parsed = await simpleParser(message.source);
    
    // Extract attachments
    const attachments = [];
    
    if (parsed.attachments && parsed.attachments.length > 0) {
      for (const attachment of parsed.attachments) {
        const fileExt = path.extname(attachment.filename || '').toLowerCase().substring(1);
        
        attachments.push({
          filename: attachment.filename,
          contentType: attachment.contentType,
          extension: fileExt,
          content: attachment.content
        });
      }
    }
    
    return {
      messageId: parsed.messageId,
      subject: parsed.subject,
      from: parsed.from.text,
      date: parsed.date,
      attachments
    };
  } catch (error) {
    console.error(`Error fetching email #${seq}:`, error);
    return null;
  }
}

/**
 * Process an email attachment based on configured extractor
 */
async function processAttachment(attachment, extractorConfig) {
  try {
    // Check if attachment matches expected type
    const fileExt = attachment.extension;
    
    if (!fileExt) {
      return { success: false, message: 'Unable to determine attachment file type' };
    }
    
    // Create a unique report ID
    const reportId = uuidv4();
    
    // Create downloads directory if it doesn't exist
    const downloadsDir = './downloads';
    if (!fs.existsSync(downloadsDir)) {
      fs.mkdirSync(downloadsDir, { recursive: true });
    }
    
    // Save attachment to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${reportId}_${timestamp}.${fileExt}`;
    const filePath = path.join(downloadsDir, fileName);
    
    fs.writeFileSync(filePath, attachment.content);
    
    // Parse the file content based on type
    let records = [];
    
    if (fileExt === 'csv') {
      // Parse CSV file
      records = await parseCsvFile(filePath, extractorConfig);
    } else if (fileExt === 'xlsx' || fileExt === 'xls') {
      // Parse Excel file
      records = await parseExcelFile(filePath, extractorConfig);
    } else if (fileExt === 'pdf') {
      // Parse PDF file
      records = await parsePdfFile(filePath, extractorConfig);
    } else {
      return { success: false, message: `Unsupported file type: ${fileExt}` };
    }
    
    return {
      success: true,
      reportId,
      filePath,
      recordCount: records.length
    };
  } catch (error) {
    console.error('Error processing attachment:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Parse a CSV file based on extractor configuration
 */
async function parseCsvFile(filePath, extractorConfig) {
  try {
    // Read file content
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Parse CSV
    const csvOptions = {
      columns: true,
      skip_empty_lines: true,
      trim: true
    };
    
    const records = csvParse(content, csvOptions);
    
    console.log(`Parsed ${records.length} records from CSV file: ${filePath}`);
    
    return records;
  } catch (error) {
    console.error('Error parsing CSV file:', error);
    throw error;
  }
}

/**
 * Parse an Excel file based on extractor configuration
 */
async function parseExcelFile(filePath, extractorConfig) {
  try {
    // Load workbook
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    
    const allRecords = [];
    
    // Determine which sheets to process
    const sheetsToProcess = extractorConfig.sheets || [];
    
    // If no specific sheets are specified, process all sheets
    if (sheetsToProcess.length === 0) {
      workbook.eachSheet(sheet => {
        sheetsToProcess.push(sheet.name);
      });
    }
    
    // Process each sheet
    for (const sheetName of sheetsToProcess) {
      const sheet = workbook.getWorksheet(sheetName);
      
      if (!sheet) {
        console.warn(`Sheet not found: ${sheetName}`);
        continue;
      }
      
      // Get headers from the first row
      const headers = [];
      sheet.getRow(1).eachCell(cell => {
        headers.push(cell.value);
      });
      
      // Process rows
      const sheetRecords = [];
      
      sheet.eachRow((row, rowNumber) => {
        // Skip header row
        if (rowNumber === 1) return;
        
        const record = {};
        
        // Map values to headers
        row.eachCell((cell, colNumber) => {
          if (colNumber <= headers.length) {
            const header = headers[colNumber - 1];
            record[header] = cell.value;
          }
        });
        
        sheetRecords.push(record);
      });
      
      console.log(`Parsed ${sheetRecords.length} records from sheet: ${sheetName}`);
      
      // Add sheet records to all records
      allRecords.push(...sheetRecords);
    }
    
    return allRecords;
  } catch (error) {
    console.error('Error parsing Excel file:', error);
    throw error;
  }
}

/**
 * Parse a PDF file based on extractor configuration
 */
async function parsePdfFile(filePath, extractorConfig) {
  try {
    // Read file content
    const dataBuffer = fs.readFileSync(filePath);
    
    // Parse PDF
    const pdfData = await parsePdf(dataBuffer);
    
    // For PDFs, we need more advanced parsing strategies
    // This is a simplified implementation - in a real system,
    // you'd need more sophisticated table extraction
    
    // Basic approach: split by lines and look for patterns
    const lines = pdfData.text.split('\n').filter(line => line.trim().length > 0);
    
    // Simple heuristic: look for lines that might be table rows
    // (e.g., contain multiple numerical values or match certain patterns)
    const possibleRecords = [];
    
    for (const line of lines) {
      // Skip headers or footers
      if (line.toLowerCase().includes('page') || line.toLowerCase().includes('report')) {
        continue;
      }
      
      // Look for lines with multiple values (simple heuristic)
      const values = line.split(/\s{2,}/).filter(v => v.trim().length > 0);
      
      if (values.length >= 3) {
        possibleRecords.push(values);
      }
    }
    
    console.log(`Extracted ${possibleRecords.length} potential records from PDF: ${filePath}`);
    
    // This is where you'd implement more sophisticated PDF table extraction
    // For now, we return an array with the raw text for further processing
    return [{ rawText: pdfData.text, extractedLines: possibleRecords }];
  } catch (error) {
    console.error('Error parsing PDF file:', error);
    throw error;
  }
}

/**
 * Get email configuration from environment variables
 */
function getEmailConfig() {
  const config = {
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '993', 10),
    secure: process.env.EMAIL_TLS !== 'false',
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  };
  
  const valid = Boolean(config.host && config.user && config.pass);
  
  return { ...config, valid };
}

/**
 * Load vendor configuration from file or create default
 */
async function loadVendorConfig() {
  try {
    const configPath = path.join(process.cwd(), 'configs', 'multi-vendor.json');
    
    // Check if config file exists
    if (fs.existsSync(configPath)) {
      const configText = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(configText);
    }
    
    // Create default configuration
    const defaultConfig = {
      vendors: defaultVendorConfigs
    };
    
    // Create configs directory if it doesn't exist
    const configsDir = path.dirname(configPath);
    if (!fs.existsSync(configsDir)) {
      fs.mkdirSync(configsDir, { recursive: true });
    }
    
    // Save default configuration
    fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
    
    return defaultConfig;
  } catch (error) {
    console.error('Error loading vendor configuration:', error);
    return { vendors: defaultVendorConfigs };
  }
}

/**
 * Create sample report data for testing
 */
async function createSampleReportData(vendor) {
  try {
    console.log(`Creating sample report data for ${vendor}...`);
    
    if (!sampleVendorData[vendor]) {
      throw new Error(`No sample data available for vendor: ${vendor}`);
    }
    
    // Create a unique report ID
    const reportId = uuidv4();
    
    // Create downloads directory if it doesn't exist
    const downloadsDir = './downloads';
    if (!fs.existsSync(downloadsDir)) {
      fs.mkdirSync(downloadsDir, { recursive: true });
    }
    
    // Create sample CSV file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${vendor}_${timestamp}.csv`;
    const filePath = path.join(downloadsDir, fileName);
    
    // Extract keys from first record
    const headers = Object.keys(sampleVendorData[vendor].records[0]).join(',');
    
    // Convert each record to CSV row
    const rows = sampleVendorData[vendor].records.map(record => 
      Object.values(record).map(v => typeof v === 'string' ? `"${v}"` : v).join(',')
    );
    
    // Write CSV file
    const csvContent = [headers, ...rows].join('\n');
    fs.writeFileSync(filePath, csvContent);
    
    console.log(`Sample ${vendor} report saved to ${filePath}`);
    
    return {
      success: true,
      reportId,
      vendor,
      filePath,
      recordCount: sampleVendorData[vendor].records.length
    };
  } catch (error) {
    console.error(`Error creating sample data for ${vendor}:`, error);
    return { success: false, message: error.message };
  }
}

export default {
  checkEmailsFromAllVendors,
  processVendorEmails,
  createSampleReportData,
  loadVendorConfig
};