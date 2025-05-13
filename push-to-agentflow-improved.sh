#!/bin/bash

# Enhanced GitHub Push Script with better error handling
echo "Starting enhanced GitHub push script..."

# Configuration
REPO_NAME="AGENTFLOW"
GITHUB_USERNAME="copp1723"
BRANCH_NAME="main"
GITHUB_TOKEN=""

# Ensure we're in the project root directory
cd "$(dirname "$0")"

# Ask for GitHub token if not provided
if [ -z "$GITHUB_TOKEN" ]; then
  echo "Enter your GitHub Personal Access Token (will not be echoed to screen):"
  read -s GITHUB_TOKEN
  echo
fi

# Make sure we have a token
if [ -z "$GITHUB_TOKEN" ]; then
  echo "Error: GitHub token is required"
  exit 1
fi

# Remove any existing .git directory
if [ -d ".git" ]; then
  echo "Removing existing Git repository..."
  rm -rf .git
fi

# Initialize Git repository
echo "Initializing fresh Git repository..."
git init

# Configure Git
echo "Configuring Git..."
git config user.name "GitHub Actions"
git config user.email "actions@github.com"

# Create .gitignore
echo "Creating .gitignore..."
cat > .gitignore << EOL
node_modules/
.env
.env.*
dist/
build/
logs/
*.log
.DS_Store
.idea/
.vscode/
*.swp
*.swo
EOL

# Add all files
echo "Adding files to Git..."
git add .

# Commit changes
echo "Committing changes..."
git commit -m "Initial commit of AGENTFLOW - AI Agent Backend"

# Add remote using HTTPS
echo "Setting up remote repository..."
git remote add origin "https://$GITHUB_USERNAME:$GITHUB_TOKEN@github.com/$GITHUB_USERNAME/$REPO_NAME.git"

# Push with force and error handling
echo "Pushing to GitHub repository..."
if git push -u origin main --force; then
  echo "Successfully pushed to https://github.com/${GITHUB_USERNAME}/${REPO_NAME}"
else
  echo "Push failed. Please check your GitHub credentials and repository permissions."
  exit 1
fi

# For security, remove the token from git config
git config --unset remote.origin.url
echo "Done! Repository URL: https://github.com/$GITHUB_USERNAME/$REPO_NAME"