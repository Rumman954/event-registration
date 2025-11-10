# GitHub Setup Instructions

## Step 1: Update Git Configuration (Optional)
If you want to update your Git identity, run:
```bash
git config user.email "your-email@example.com"
git config user.name "Your Name"
```

Or set it globally for all repositories:
```bash
git config --global user.email "your-email@example.com"
git config --global user.name "Your Name"
```

## Step 2: Create GitHub Repository
1. Go to https://github.com/new
2. Enter a repository name (e.g., `task2-event-registration`)
3. Choose public or private
4. **DO NOT** initialize with README, .gitignore, or license (we already have these)
5. Click "Create repository"

## Step 3: Push to GitHub
After creating the repository, GitHub will show you commands. Run these in your terminal:

```bash
# Add the remote repository (replace YOUR_USERNAME and REPO_NAME)
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git

# Rename branch to main (if needed)
git branch -M main

# Push to GitHub
git push -u origin main
```

If your default branch is already `master`, use:
```bash
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git
git push -u origin master
```

## Step 4: Verify
Check your GitHub repository page to confirm all files have been uploaded.

