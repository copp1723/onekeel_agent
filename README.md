# AI Agent Backend using Eko

A flexible AI agent backend using Fellou Eko that executes various tasks including web crawling, flight status checking, and dealer interactions. The agent accepts natural language input and returns structured data as JSON.

## Features

### Core Features
- ✅ Accepts natural language tasks for multiple use cases
- ✅ Uses Eko as the agent runtime
- ✅ Implements a crawlWebsite tool that uses Firecrawl
- ✅ Stores API keys and credentials securely in Supabase
- ✅ Returns structured data in JSON format

### Extended Features (Phase 2)
- ✅ Multiple tools (crawlWebsite, checkFlightStatus)
- ✅ Secure credential storage with dealerCredentials
- ✅ LLM-powered task parsing and intent recognition
- ✅ REST API endpoint for task submission and tracking
- ✅ Task logging and status tracking
- ✅ Multi-step task execution (extract-then-summarize)

## Prerequisites

- Node.js and npm installed
- Supabase account with a project set up
- Eko API key from [Fellou Eko](https://eko.fellou.ai/)
- Firecrawl API key for web crawling

## Setup

1. Clone this repository:

```
git clone https://github.com/yourusername/ai-agent-backend.git
cd ai-agent-backend
```

2. Install dependencies:

```
npm install
```

3. Configure environment variables:

   - Copy `.env.example` to `.env`
   - Update with your actual API keys and Supabase connection string
   
   **Important API Key Information:**
   - `EKO_API_KEY`: Required for the AI agent to function. This should be a valid OpenAI API key that can access models like `gpt-4o-mini`.
   - `DATABASE_URL`: Required for storing and retrieving credentials.
   - Firecrawl API key: This should be added to the database using the provided utility script.

4. Set up the Supabase database:

   - Make sure your Supabase project is created
   - The database table will be created automatically when you first run the application
   - Add your Firecrawl API key to the database using the provided script:

```bash
# From the command line:
npm run setup-key YOUR_FIRECRAWL_API_KEY

# Or manually through SQL in the Supabase SQL Editor:
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY NOT NULL,
  key_name VARCHAR(255) NOT NULL UNIQUE,
  key_value TEXT NOT NULL
);

-- Insert your Firecrawl API key
INSERT INTO api_keys (id, key_name, key_value)
VALUES ('1', 'firecrawl', 'your_firecrawl_api_key_here');
```

5. Build and run the project:

```bash
# Build and run the main agent
npm run build
npm start

# Or run the API server (Phase 2)
npm run build
node dist/api/server.js
```

6. To start the API server (Phase 2 feature):

```bash
# Start the API server on port 5000
node dist/api/server.js
```

You can then submit tasks to the API:

```bash
# Submit a web crawling task
curl -X POST http://localhost:5000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"task": "Crawl https://news.ycombinator.com and extract the title, url, and score of the top 5 posts"}'

# Check task status
curl http://localhost:5000/api/tasks/{task_id}

# List all tasks
curl http://localhost:5000/api/tasks
```

### Simplified Server (No Database Dependencies)

A simplified version of the server is also available that doesn't require any database connections:

```bash
# Run the simplified server
node dist/index.js
```

This version provides all the same API endpoints but stores data in memory instead of a database.

## Usage

### Basic Usage (Phase 1)
The application takes a natural language task description and uses it to crawl websites. By default, it crawls Hacker News to extract data from the top posts, but you can modify the task in `src/index.ts` to crawl any website.

Example task:

```
"Crawl https://news.ycombinator.com and extract the title, url, and score of the top 5 posts"
```

### Extended Usage (Phase 2)
With the Phase 2 extensions, the agent supports multiple tools and task types:

1. **Web Crawling Tasks**:
   ```
   "Crawl https://example.com and extract all product information"
   ```

2. **Web Content Extraction**:
   ```
   "Extract clean content from https://example.com"
   "Get the article text from https://news.example.com/article"
   ```

3. **Flight Status Checks**:
   ```
   "Check the status of flight UA123 for today"
   ```

4. **Dealer Credential Management**:
   ```
   "Login to the dealer portal for dealer ABC123"
   ```

The agent will automatically parse the task intent using either rule-based or LLM-powered parsing, select the appropriate tool, and execute the task.

### API Usage

You can also use the REST API to submit tasks and retrieve results. Start the API server and use the following endpoints:

#### Asynchronous API (v1)
- `POST /api/tasks` - Submit a new task (returns immediately with a task ID)
- `GET /api/tasks/:taskId` - Get a specific task's status and results
- `GET /api/tasks` - List all tasks

#### Direct Task Execution API (v2)
- `POST /submit-task` - Submit a task and wait for completion (returns the result or error)

Example POST request to /submit-task:

```bash
curl -X POST http://localhost:5000/submit-task \
  -H "Content-Type: application/json" \
  -d '{"task": "Crawl https://example.com and summarize"}'
```

Example response:

```json
{
  "success": true,
  "result": {
    "summary": "Example.com is a domain used for illustrative examples in documents...",
    "links": [
      "https://www.iana.org/domains/example"
    ]
  }
}
```

All task executions are logged to the database with the following information:
- User input (original task)
- Tool used for execution
- Status (success/error)
- Output or error details

## Project Structure

### Core Components (Phase 1)
- `src/index.ts` - Main entry point
- `src/tools/crawlWebsite.ts` - Web crawling tool using Firecrawl
- `src/services/supabase.ts` - Service for interacting with Supabase
- `src/shared/schema.ts` - Database schema definitions
- `src/scripts/setup-db.ts` - Database setup script

### Extended Components (Phase 2)
- `src/tools/checkFlightStatus.ts` - Flight status checking tool
- `src/services/taskParser.ts` - Task parsing and intent recognition
- `src/api/server.ts` - REST API for task submission and management
- `src/scripts/insert-firecrawl-key.ts` - Utility to add Firecrawl API key

### Logging & Database Components (Phase 3)
- `src/shared/db.ts` - Database connection and Drizzle ORM setup
- `src/shared/logger.ts` - Task logging utilities for DB persistence
- `/submit-task` endpoint - Direct task execution with immediate response
- `dist/index.js` - Simplified server with no database dependencies

### Database Schemas
- `api_keys` - Secure storage for API keys
- `dealer_credentials` - Secure storage for dealer login credentials
- `task_logs` - Persistent storage for task execution history and results

## Technologies Used

- [Eko AI](https://eko.fellou.ai/) - AI agent framework
- [Firecrawl](https://firecrawl.dev/) - Web scraping API
- [Supabase](https://supabase.com/) - Database for storing API keys
- [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript
- [Drizzle ORM](https://orm.drizzle.team/) - Database ORM

## Extending the Project

To add more tools or capabilities:

1. Create a new tool in `src/tools/`
2. Update `src/index.ts` to register the tool with Eko
3. Update your natural language task to utilize the new tool

## License

MIT