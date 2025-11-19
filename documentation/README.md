# API Documentation

This documentation is automatically generated from JSDoc comments in the project files using [JSDoc](https://jsdoc.app/).

## How It Works

The system uses a **git hook** (`post-commit`) that:
1. Detects when `.js` files were changed in the last commit
2. Automatically extracts JSDoc comments
3. Generates HTML documentation in the `api/` folder with an organized interface
4. Creates a separate commit with the updated documentation

## Installation

### 1. Install Git Hook

Run the installation script:

```bash
cd documentation
./install-hook.sh
```

### 2. Install Dependencies

Dependencies will be automatically installed the first time the hook runs, but you can install manually:

```bash
cd documentation
npm install
```

## Manual Usage

To generate documentation manually (without committing):

```bash
cd documentation
npm run extract
```

This will:
- Read all `.js` files in `src/`
- Extract JSDoc comments
- Generate HTML documentation in `api/`
- Open `api/index.html` in your browser to view the documentation

## Structure

```
documentation/
├── package.json          # Node.js dependencies
├── jsdoc.json            # JSDoc configuration
├── install-hook.sh       # Hook installation script
├── api/                  # Generated HTML documentation
│   ├── index.html        # Main documentation page
│   └── ...
└── README.md             # This file
```

## Viewing

Open `api/index.html` in your browser to see the complete documentation with:
- Side navigation with all modules
- Function and class search
- Syntax-highlighted source code
- Responsive and modern interface

## Notes

- The hook only runs when `.js` files are changed in a commit
- Documentation is committed separately from code changes for cleaner git history
- Files without JSDoc comments won't appear in the documentation
- The `api/` folder contains only automatically generated files
