/**
 * PDF Extractor Demo
 * 
 * This script demonstrates the usage of the PDF extraction adapter.
 * It extracts tables from a PDF file using both lattice and stream modes.
 */

import path from 'path';
import fs from 'fs';
import { 
  extractTablesFromPDFFile, 
  PDFExtractionMode 
} from '../utils/pdfExtractor.js';

async function main() {
  try {
    // Path to the PDF file
    const pdfFilePath = path.join(process.cwd(), 'real data files', 'Vinconnect APPT PERFORMANCE.pdf');
    
    // Check if the file exists
    if (!fs.existsSync(pdfFilePath)) {
      console.error(`File not found: ${pdfFilePath}`);
      return;
    }
    
    console.log(`Extracting tables from: ${pdfFilePath}`);
    
    // Extract tables using AUTO mode
    console.log('\n=== AUTO MODE ===');
    const autoResult = await extractTablesFromPDFFile(pdfFilePath, {
      mode: PDFExtractionMode.AUTO,
      minConfidence: 0.5,
    });
    
    console.log(`Success: ${autoResult.success}`);
    console.log(`Extraction Mode Used: ${autoResult.metadata.extractionMode}`);
    console.log(`Tables Found: ${autoResult.metadata.tableCount}`);
    console.log(`Confidence: ${autoResult.metadata.confidence.toFixed(2)}`);
    
    if (autoResult.tables.length > 0) {
      console.log('\nFirst Table Sample (first 3 records):');
      console.log(JSON.stringify(autoResult.tables[0].slice(0, 3), null, 2));
    } else {
      console.log('No tables found in AUTO mode.');
    }
    
    // Extract tables using LATTICE mode
    console.log('\n=== LATTICE MODE ===');
    const latticeResult = await extractTablesFromPDFFile(pdfFilePath, {
      mode: PDFExtractionMode.LATTICE,
      minConfidence: 0.5,
    });
    
    console.log(`Success: ${latticeResult.success}`);
    console.log(`Tables Found: ${latticeResult.metadata.tableCount}`);
    console.log(`Confidence: ${latticeResult.metadata.confidence.toFixed(2)}`);
    
    if (latticeResult.tables.length > 0) {
      console.log('\nFirst Table Sample (first 3 records):');
      console.log(JSON.stringify(latticeResult.tables[0].slice(0, 3), null, 2));
    } else {
      console.log('No tables found in LATTICE mode.');
    }
    
    // Extract tables using STREAM mode
    console.log('\n=== STREAM MODE ===');
    const streamResult = await extractTablesFromPDFFile(pdfFilePath, {
      mode: PDFExtractionMode.STREAM,
      minConfidence: 0.5,
    });
    
    console.log(`Success: ${streamResult.success}`);
    console.log(`Tables Found: ${streamResult.metadata.tableCount}`);
    console.log(`Confidence: ${streamResult.metadata.confidence.toFixed(2)}`);
    
    if (streamResult.tables.length > 0) {
      console.log('\nFirst Table Sample (first 3 records):');
      console.log(JSON.stringify(streamResult.tables[0].slice(0, 3), null, 2));
    } else {
      console.log('No tables found in STREAM mode.');
    }
    
  } catch (error) {
    console.error('Error in PDF extraction demo:');
    console.error(error);
  }
}

// Run the demo
main().catch(console.error);
