
#!/bin/bash

# Push to AGENTFLOW repository script
echo "Creating fresh Git repository and pushing to AGENTFLOW..."

# Ensure we're in the project root directory
cd "$(dirname "$0")"

# Remove any existing .git directory if it exists
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
git commit -m "Initial commit of AGENTFLOW - AI Agent Backend"

# Add remote repository URL with AGENTFLOW name
echo "Setting up remote repository..."
git remote add origin https://github.com/copp1723/AGENTFLOW.git

# Push to GitHub with force to overwrite any existing content
echo "Pushing to GitHub repository..."
git push -u origin main --force

echo "Done! Repository has been pushed to https://github.com/copp1723/AGENTFLOW.git"
