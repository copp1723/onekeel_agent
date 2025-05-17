/**
 * Example usage of the PDF Extraction Adapter
 * 
 * This example demonstrates how to use the PDF extraction adapter
 * to extract tables from PDF files.
 */

import path from 'path';
import { 
  extractTablesFromPDFFile, 
  PDFExtractionMode 
} from '../utils/pdfExtractor.js';
import { isError } from '../utils/errorUtils.js';

/**
 * Main function to demonstrate PDF extraction
 */
async function main() {
  try {
    // Path to the PDF file
    const pdfFilePath = path.join(process.cwd(), 'real data files', 'Vinconnect APPT PERFORMANCE.pdf');
    
    console.log(`Extracting tables from: ${pdfFilePath}`);
    
    // Extract tables using AUTO mode (tries both lattice and stream)
    const autoResult = await extractTablesFromPDFFile(pdfFilePath, {
      mode: PDFExtractionMode.AUTO,
      trim: true,
      minConfidence: 0.6,
    });
    
    console.log('\n--- AUTO MODE RESULTS ---');
    console.log(`Success: ${autoResult.success}`);
    console.log(`Extraction Mode Used: ${autoResult.metadata.extractionMode}`);
    console.log(`Tables Found: ${autoResult.metadata.tableCount}`);
    console.log(`Confidence: ${autoResult.metadata.confidence.toFixed(2)}`);
    
    if (autoResult.tables.length > 0) {
      console.log('\nFirst Table Sample (first 3 records):');
      console.log(JSON.stringify(autoResult.tables[0].slice(0, 3), null, 2));
    }
    
    // Extract tables using LATTICE mode (for bordered tables)
    const latticeResult = await extractTablesFromPDFFile(pdfFilePath, {
      mode: PDFExtractionMode.LATTICE,
    });
    
    console.log('\n--- LATTICE MODE RESULTS ---');
    console.log(`Success: ${latticeResult.success}`);
    console.log(`Tables Found: ${latticeResult.metadata.tableCount}`);
    console.log(`Confidence: ${latticeResult.metadata.confidence.toFixed(2)}`);
    
    // Extract tables using STREAM mode (for whitespace-separated tables)
    const streamResult = await extractTablesFromPDFFile(pdfFilePath, {
      mode: PDFExtractionMode.STREAM,
    });
    
    console.log('\n--- STREAM MODE RESULTS ---');
    console.log(`Success: ${streamResult.success}`);
    console.log(`Tables Found: ${streamResult.metadata.tableCount}`);
    console.log(`Confidence: ${streamResult.metadata.confidence.toFixed(2)}`);
    
    // Compare results
    console.log('\n--- COMPARISON ---');
    console.log(`Best Mode: ${getBestMode(autoResult, latticeResult, streamResult)}`);
    
  } catch (error) {
    console.error('Error in PDF extraction example:');
    if (isError(error)) {
      console.error(`${error.name}: ${error.message}`);
      console.error(error.stack);
    } else {
      console.error(String(error));
    }
  }
}

/**
 * Determine the best extraction mode based on results
 */
function getBestMode(auto: any, lattice: any, stream: any): string {
  const modes = [
    { name: 'AUTO', confidence: auto.metadata.confidence, tables: auto.metadata.tableCount },
    { name: 'LATTICE', confidence: lattice.metadata.confidence, tables: lattice.metadata.tableCount },
    { name: 'STREAM', confidence: stream.metadata.confidence, tables: stream.metadata.tableCount },
  ];
  
  // Sort by confidence and then by number of tables
  modes.sort((a, b) => {
    if (b.confidence !== a.confidence) {
      return b.confidence - a.confidence;
    }
    return b.tables - a.tables;
  });
  
  return modes[0].name;
}

// Run the example
main().catch(console.error);
