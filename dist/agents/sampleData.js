/**
 * Sample Data Provider
 * Provides sample data for testing CRM report flows without real credentials
 */
/**
 * Returns a sample CSV report for the specified dealer ID
 * Used when USE_SAMPLE_DATA environment variable is set to 'true'
 * @param dealerId - Dealer ID to include in the sample data
 * @param platform - CRM platform (VinSolutions or VAUTO)
 * @returns Sample CSV data
 */
export function getSampleReport(dealerId, platform = 'VinSolutions') {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const formattedDate = yesterday.toISOString().split('T')[0]; // YYYY-MM-DD format
    if (platform.toLowerCase() === 'vinsolutions') {
        // Sample VinSolutions sales report
        return `Date,DealerID,SalesRep,Customer,VIN,Vehicle,SalePrice,TradeIn,Profit
${formattedDate},${dealerId},John Smith,Customer 1,1HGCM82633A123456,2023 Honda Accord,32500,Yes,3200
${formattedDate},${dealerId},Sarah Johnson,Customer 2,5XYZU3LB4DG123457,2022 Hyundai Tucson,28750,No,2800
${formattedDate},${dealerId},Michael Brown,Customer 3,1FTEW1EP7MFA12345,2023 Ford F-150,45900,Yes,4100
${formattedDate},${dealerId},Jessica Wilson,Customer 4,WAUENAF44HN123458,2022 Audi A4,42300,No,3900
${formattedDate},${dealerId},Robert Davis,Customer 5,5TDZA3DC1CS123459,2022 Toyota Sienna,38700,Yes,3600`;
    }
    else {
        // Sample VAUTO inventory report
        return `Date,DealerID,StockNumber,VIN,Make,Model,Year,Days,Cost,ListPrice,CurrentValue
${formattedDate},${dealerId},S12345,1HGCM82633A123456,Honda,Accord,2023,12,30000,33500,32200
${formattedDate},${dealerId},S12346,5XYZU3LB4DG123457,Hyundai,Tucson,2022,8,25000,28000,27300
${formattedDate},${dealerId},S12347,1FTEW1EP7MFA12345,Ford,F-150,2023,5,41000,46000,45500
${formattedDate},${dealerId},S12348,WAUENAF44HN123458,Audi,A4,2022,15,38000,42000,40800
${formattedDate},${dealerId},S12349,5TDZA3DC1CS123459,Toyota,Sienna,2022,10,34500,38500,37800`;
    }
}
/**
 * Creates a temporary CSV file with sample data
 * @param dealerId - Dealer ID to include in the sample data
 * @param platform - CRM platform (VinSolutions or VAUTO)
 * @returns Path to the temporary file
 */
export async function createSampleReportFile(dealerId, platform = 'VinSolutions') {
    const fs = await import('fs/promises');
    const path = await import('path');
    const os = await import('os');
    // Generate sample data
    const sampleData = getSampleReport(dealerId, platform);
    // Create temporary file
    const tempDir = os.tmpdir();
    const fileName = `${platform.toLowerCase()}_${dealerId}_report_${Date.now()}.csv`;
    const filePath = path.join(tempDir, fileName);
    // Write sample data to file
    await fs.writeFile(filePath, sampleData, 'utf-8');
    return filePath;
}
//# sourceMappingURL=sampleData.js.map