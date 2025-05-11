// Simple test server implementation
import express from 'express';

const app = express();
app.use(express.json());

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({ 
    status: 'up',
    version: '1.0.0',
    message: 'Test API server is running'
  });
});

// Test parser endpoint
app.post('/test-parser', (req, res) => {
  const result = {
    received: req.body,
    status: 'parsed',
    timestamp: new Date().toISOString()
  };
  
  res.status(200).json(result);
});

// Start the server
const PORT = process.env.PORT || 5002;

// Only start the server if this module is run directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Test API server running on port ${PORT}`);
    console.log(`Available endpoints:`);
    console.log(`  GET /health - Health check`);
    console.log(`  POST /test-parser - Test parser endpoint`);
  });
}

export { app };