
#!/bin/bash

# TypeScript Error Fixer Script
echo "Starting TypeScript error fixes..."

# 1. Fix src/server/storage.ts credential issues
echo "Fixing storage.ts credential issues..."
sed -i 's/site: string/platform: string/g' src/server/storage.ts
sed -i 's/credentials.site/credentials.platform/g' src/server/storage.ts
sed -i 's/passwordEncrypted/encryptedData/g' src/server/storage.ts
sed -i 's/username: dataToInsert.username/label: dataToInsert.label/g' src/server/storage.ts

# 2. Fix src/services/healthService.ts message property issue
echo "Fixing healthService.ts optional message property..."
sed -i 's/message: string | undefined;/message?: string;/g' src/services/healthService.ts

# 3. Fix src/server/routes/jobs.ts router handler return types
echo "Fixing route handler return types in jobs.ts..."
sed -i 's/return res.json(/res.json(/ ; s/return res.status(/res.status(/g' src/server/routes/jobs.ts

# 4. Fix src/services/mailerServiceAlternative.ts EmailLog references
echo "Fixing EmailLog references in mailerServiceAlternative.ts..."
sed -i 's/EmailLog/emailLogs/g' src/services/mailerServiceAlternative.ts

# 5. Fix src/services/simpleScheduler.ts null check
echo "Fixing null check in simpleScheduler.ts..."
sed -i 's/await executeWorkflowById(schedule.workflowId);/if (schedule.workflowId) await executeWorkflowById(schedule.workflowId);/g' src/services/simpleScheduler.ts

# 6. Fix src/services/taskParser.ts LLMs import
echo "Fixing LLMs import in taskParser.ts..."
sed -i 's/import { Eko, LLMs } from/import { Eko } from/g' src/services/taskParser.ts

# 7. Fix planId type in taskParser.ts
echo "Fixing planId type in taskParser.ts..."
sed -i 's/planId: planId,/planId: planId.toString(),/g' src/services/taskParser.ts

# 8. Fix fetch method in emailOTP.ts
echo "Fixing fetch method in emailOTP.ts..."
sed -i 's/connection.fetch(/connection.search(/g' src/utils/emailOTP.ts

echo "TypeScript fixes applied. Running type check to verify..."
node scripts/type-check.js
