// Mock database
jest.mock('../../shared/db', () => ({
  db: {
    update: jest.fn().mockResolvedValue({ rowCount: 1 }),
    query: {
      reports: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'test-report-1',
          reportData: { test: 'data' },
          vendor: 'VinSolutions'
        })
      }
    }
  }
}));
// Mock logger
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}));