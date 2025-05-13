
#!/bin/bash

# Fresh Git push script for AI Agent Backend project
echo "Creating fresh Git repository and pushing to GitHub..."

# Ensure we're in the project root directory
cd "$(dirname "$0")"

# Remove any existing .git directory if it exists and is locked
if [ -d ".git" ]; then
  echo "Removing existing Git repository..."
  rm -rf .git
fi

# Initialize a new Git repository
echo "Initializing fresh Git repository..."
git init

# Configure Git user (required for commits)
echo "Configuring Git user..."
git config user.name "GitHub Actions"
git config user.email "actions@github.com"

# Create .gitignore file
echo "Creating .gitignore file..."
cat > .gitignore << EOL
# Node.js
node_modules/
npm-debug.log
yarn-debug.log
yarn-error.log

# Environment variables
.env
.env.local
.env.*.local

# Build files
dist/
build/

# Logs
logs/
*.log

# MacOS
.DS_Store

# IDE files
.idea/
.vscode/
*.swp
*.swo

# Dependency directories
jspm_packages/
EOL

# Add all files
echo "Adding files to Git..."
git add .

# Commit changes
echo "Committing changes..."
git commit -m "Initial commit of AI Agent Backend using Eko"

# Add remote repository URL
echo "Setting up remote repository..."
git remote add origin https://github.com/copp1723/rep_agentflow.git

# Push to GitHub
echo "Pushing to GitHub repository..."
git push -u origin master --force

echo "Done! Your repository should now be pushed to GitHub."
