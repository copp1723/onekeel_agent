/**
 * Mock for pdf-parse library
 */

const mockPdfParse = jest.fn().mockImplementation(() => {
  return Promise.resolve({
    numpages: 1,
    numrender: 1,
    info: {},
    metadata: {},
    text: `
      SALES REPORT
      
      Date: 2023-01-01
      
      Customer Name    Vehicle    Price    Date Sold
      John Smith       Ford F150  $45,000  2023-01-01
      Jane Doe         Honda CRV  $32,000  2023-01-02
      Bob Johnson      Toyota     $28,500  2023-01-03
      
      Total Sales: $105,500
    `,
    version: '1.0'
  });
});

module.exports = mockPdfParse;
