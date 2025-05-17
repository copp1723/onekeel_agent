/**
 * Data Processing Utilities
 * 
 * Exports all data processing functionality from the utils directory.
 */

// Export column mapping functionality
export * from './columnMapping';

// Export schema validation functionality
export * from './schemas';

// Export data normalization functionality
export * from './dataNormalization';

// Export data ingestion functionality
export * from './dataIngestion';

// Export default objects
import columnMapping from './columnMapping';
import schemas from './schemas';
import dataNormalization from './dataNormalization';
import dataIngestion from './dataIngestion';

export default {
  columnMapping,
  schemas,
  dataNormalization,
  dataIngestion
};
