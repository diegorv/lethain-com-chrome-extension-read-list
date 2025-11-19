#!/bin/bash

# Script to install git hook that automatically extracts documentation

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOOK_FILE="$PROJECT_ROOT/.git/hooks/post-commit"
DOCS_DIR="$PROJECT_ROOT/documentation"

# Check if we're in a git repository
if [ ! -d "$PROJECT_ROOT/.git" ]; then
    echo "❌ Error: Not a git repository"
    exit 1
fi

# Create hooks directory if it doesn't exist
mkdir -p "$PROJECT_ROOT/.git/hooks"

# Create the hook
cat > "$HOOK_FILE" << 'HOOK_EOF'
#!/bin/bash

# Git hook to automatically extract JSDoc documentation in a separate commit

PROJECT_ROOT="$(git rev-parse --show-toplevel)"
DOCS_DIR="$PROJECT_ROOT/documentation"

# Check if the last commit had .js files changed
LAST_COMMIT_FILES=$(git diff-tree --no-commit-id --name-only -r HEAD | grep '\.js$' || true)

if [ -z "$LAST_COMMIT_FILES" ]; then
    # No .js files in last commit, exit silently
    exit 0
fi

# Check if documentation files are already in the last commit
LAST_COMMIT_DOCS=$(git diff-tree --no-commit-id --name-only -r HEAD | grep '^documentation/api/' || true)

if [ -n "$LAST_COMMIT_DOCS" ]; then
    # Documentation was already committed, skip to avoid duplicate commits
    exit 0
fi

echo "📚 .js files changed in last commit, generating documentation..."

# Navigate to documentation directory
cd "$DOCS_DIR" || exit 1

# Check if node_modules exists, if not, install dependencies
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Run documentation extraction
npm run extract

# Check if there are changes to commit
if git diff --quiet "$DOCS_DIR/api/" "$DOCS_DIR/README.md" 2>/dev/null; then
    # No changes, exit silently
    exit 0
fi

# Add generated documentation files
git add "$DOCS_DIR/api/" "$DOCS_DIR/README.md" 2>/dev/null || true

# Create a separate commit for documentation
if ! git diff --cached --quiet; then
    git commit -m "docs: update API documentation" --no-verify
    echo "✅ Documentation updated in separate commit"
else
    echo "⚠️  No documentation changes to commit"
fi
HOOK_EOF

# Make hook executable
chmod +x "$HOOK_FILE"

echo "✅ Git hook installed successfully!"
echo "📝 The hook will run automatically after each commit"
echo ""
echo "To test manually, run:"
echo "  cd $DOCS_DIR && npm install && npm run extract"
