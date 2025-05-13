#!/bin/bash

# Script to set up Git repository for AgentFlow

echo "Setting up Git repository for AgentFlow..."

# Check if Git is installed
if ! command -v git &> /dev/null; then
    echo "Git is not installed. Please install Git first."
    exit 1
fi

# Initialize Git repository if not already initialized
if [ ! -d ".git" ]; then
    echo "Initializing Git repository..."
    git init
else
    echo "Git repository already initialized."
fi

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

# Temporary files
tmp/
temp/
EOL

# Configure Git user
echo "Configuring Git user..."
read -p "Enter your Git username: " username
read -p "Enter your Git email: " email

git config user.name "$username"
git config user.email "$email"

# Add all files to Git
echo "Adding files to Git..."
git add .

# Commit changes
echo "Committing changes..."
git commit -m "Initial commit of AgentFlow"

# Set up remote repository
echo "Setting up remote repository..."
read -p "Enter your GitHub repository URL (e.g., https://github.com/username/agentflow.git): " repo_url

if [ -z "$repo_url" ]; then
    echo "No repository URL provided. Skipping remote setup."
else
    git remote remove origin 2>/dev/null || true
    git remote add origin "$repo_url"
    
    # Push to GitHub
    echo "Pushing to GitHub repository..."
    git push -u origin main || git push -u origin master
fi

echo "Git repository setup complete!"
echo "You can now push your code to GitHub with 'git push origin main'."
