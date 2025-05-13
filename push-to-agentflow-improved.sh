
#!/bin/bash

# Enhanced GitHub Push Script with PAT Authentication
echo "Starting enhanced GitHub push script..."

# Configuration - Replace with your actual values
GITHUB_USERNAME="copp1723"
REPO_NAME="AGENTFLOW"
# Leave this empty, you'll input it when the script runs for security
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

# Remove any existing .git directory to avoid lock issues
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

# Create the repository if it doesn't exist
echo "Checking if repository exists..."
curl -s -o /dev/null -w "%{http_code}" -H "Authorization: token $GITHUB_TOKEN" "https://api.github.com/repos/$GITHUB_USERNAME/$REPO_NAME" | grep -q "404"
if [ $? -eq 0 ]; then
  echo "Repository doesn't exist. Creating it..."
  curl -H "Authorization: token $GITHUB_TOKEN" -d "{\"name\":\"$REPO_NAME\",\"private\":false}" https://api.github.com/user/repos
else
  echo "Repository already exists."
fi

# Set the remote with token-based URL
echo "Setting up remote repository with token authentication..."
git remote add origin "https://$GITHUB_USERNAME:$GITHUB_TOKEN@github.com/$GITHUB_USERNAME/$REPO_NAME.git"

# Verify remote connection
echo "Verifying connection to remote repository..."
git remote -v

# Try pushing with verbose output
echo "Pushing to GitHub repository with verbose output..."
GIT_CURL_VERBOSE=1 git push -u origin master --force

# Check if push was successful
if [ $? -eq 0 ]; then
  echo "✅ Successfully pushed to https://github.com/$GITHUB_USERNAME/$REPO_NAME"
else
  echo "❌ Push failed. Trying alternative approach..."
  
  # Try with HTTPS instead (sometimes works better on Replit)
  git remote remove origin
  git remote add origin "https://$GITHUB_TOKEN@github.com/$GITHUB_USERNAME/$REPO_NAME.git"
  
  echo "Trying alternative push method..."
  GIT_CURL_VERBOSE=1 git push -u origin master --force
  
  if [ $? -eq 0 ]; then
    echo "✅ Alternative push method successful!"
  else
    echo "❌ Both push methods failed. Please check your token and network connection."
  fi
fi

# For security, remove the token from git config
git config --unset remote.origin.url
echo "Done! Repository URL: https://github.com/$GITHUB_USERNAME/$REPO_NAME"
