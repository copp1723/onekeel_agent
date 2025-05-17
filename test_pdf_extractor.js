/**
 * Test script for the TypeScript PDF Extractor.
 * 
 * This script tests the PDF extractor with a sample PDF file.
 */

const { extractTablesFromPDFFile } = require('./dist/utils/pdfExtractor');
const path = require('path');

async function testPdfExtractor(pdfPath) {
  try {
    console.log(`Testing PDF extractor with file: ${pdfPath}`);
    
    // Extract tables from the PDF
    const result = await extractTablesFromPDFFile(pdfPath, {
      mode: 'auto',
      trim: true,
      minConfidence: 0.5
    });
    
    console.log('\nExtraction Results:');
    console.log(`- Success: ${result.success}`);
    console.log(`- Tables found: ${result.tables.length}`);
    console.log(`- Pages processed: ${result.metadata.pageCount}`);
    console.log(`- Extraction method: ${result.metadata.extractionMode}`);
    console.log(`- Confidence: ${result.metadata.confidence.toFixed(2)}`);
    
    if (result.metadata.processingIssues && result.metadata.processingIssues.length > 0) {
      console.log('\nProcessing issues:');
      result.metadata.processingIssues.forEach((issue, index) => {
        console.log(`  ${index + 1}. ${issue}`);
      });
    }
    
    // Display the first table if available
    if (result.tables.length > 0) {
      console.log('\nFirst table preview:');
      const table = result.tables[0];
      const preview = table.slice(0, 5); // Show first 5 rows
      console.log(JSON.stringify(preview, null, 2));
    }
    
    return result;
    
  } catch (error) {
    console.error('Error testing PDF extractor:', error);
    throw error;
  }
}

// Get the PDF file path from command line arguments or use the default
const pdfPath = process.argv[2] || path.join(__dirname, 'test-data/pdfs/table_sample.pdf');

// Run the test
testPdfExtractor(pdfPath)
  .then(() => console.log('\nTest completed successfully'))
  .catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
  });
