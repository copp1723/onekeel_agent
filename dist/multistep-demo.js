// Simple demo of the multi-step content extraction and summarization
import express from 'express';
import dotenv from 'dotenv';
import { extractAndSummarize } from './summaryExtractor.js';
// Load environment variables
dotenv.config();
// Create Express app
const app = express();
app.use(express.json());
// Health check endpoint
app.get('/health', (_req, res) => {
    res.status(200).json({
        status: 'ok',
        message: 'Multi-step extraction and summarization demo is running'
    });
});
// Endpoint for content extraction and summarization
app.post('/summarize', async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) {
            return res.status(400).json({
                success: false,
                error: 'URL is required'
            });
        }
        console.log(`Received request to summarize content from: ${url}`);
        // Verify that OpenAI API key is available in env
        if (!process.env.OPENAI_API_KEY) {
            return res.status(500).json({
                success: false,
                error: 'OpenAI API key not configured'
            });
        }
        // Execute the multi-step process
        const result = await extractAndSummarize(url);
        // Return the result
        return res.status(200).json({
            success: true,
            result
        });
    }
    catch (error) {
        console.error('Error processing request:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'An error occurred'
        });
    }
});
// Start the server
const PORT = process.env.MULTISTEP_PORT || 3000;
app.listen(PORT, () => {
    console.log(`Multi-step demo API running on port ${PORT}`);
    console.log('Available endpoints:');
    console.log('  POST /summarize - Summarize content from a URL');
    console.log('  GET /health - Health check endpoint');
});
//# sourceMappingURL=multistep-demo.js.map