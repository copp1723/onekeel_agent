
#!/bin/bash

# Git push script for AI Agent Backend project
echo "Setting up Git and pushing to GitHub repository..."

# Initialize Git if not already initialized
if [ ! -d ".git" ]; then
  echo "Initializing Git repository..."
  git init
else
  echo "Git repository already initialized."
fi

# Configure Git user (required for commits)
# You may want to update these with your actual info
git config user.name "GitHub Actions"
git config user.email "actions@github.com"

# Add all files to Git
echo "Adding files to Git..."
git add .

# Create .gitignore file if it doesn't exist
if [ ! -f ".gitignore" ]; then
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
  git add .gitignore
fi

# Commit changes
echo "Committing changes..."
git commit -m "Initial commit of AI Agent Backend using Eko"

# Add remote repository URL (replace with your actual URL)
echo "Setting up remote repository..."
git remote remove origin 2>/dev/null || true
git remote add origin https://github.com/copp1723/rep_agentflow.git

# Push to GitHub
echo "Pushing to GitHub repository..."
git push -u origin main || git push -u origin master

echo "Done! Check the output above for any errors."
