# Migration to uv - Complete Guide

This project has been successfully migrated from traditional Python dependency management (pip + requirements.txt) to the modern **uv** package manager.

## What Changed?

### 1. Dependency Management

**Before:**
- Used `requirements.txt` and `mcp-server/requirements.txt`
- Manual virtual environment creation with `python -m venv venv`
- Dependency installation with `pip install -r requirements.txt`

**After:**
- Single `pyproject.toml` file for all dependencies
- Virtual environment managed by uv (`.venv/`)
- Automatic dependency resolution with `uv sync`
- Lock file (`uv.lock`) for reproducible builds

### 2. Python Version Requirement

- **Updated from Python 3.9+ to Python 3.10+**
- Required because `claude-agent-sdk` needs Python 3.10+

### 3. Files Added

- ✅ `pyproject.toml` - Modern Python project configuration
- ✅ `uv.lock` - Dependency lock file (automatically generated)
- ✅ `.venv/` - Virtual environment directory (in .gitignore)

### 4. Files Removed

- ❌ `requirements.txt`
- ❌ `mcp-server/requirements.txt`
- ❌ `venv/` (old virtual environment)

### 5. Updated Files

- ✏️ `Makefile` - All commands now use `uv`
- ✏️ `README.md` - Updated setup instructions
- ✏️ `setup.sh` - Automated setup script
- ✏️ `.gitignore` - Added `.venv/`

## Why uv?

uv is a modern Python package manager that is:

- ⚡ **10-100x faster** than pip
- 🔒 **More reliable** with proper dependency resolution
- 📦 **Single tool** for virtualenv + package management
- 🔄 **Drop-in replacement** for pip/venv workflows
- 🎯 **Better caching** and disk space usage

Learn more: https://docs.astral.sh/uv/

## Installation

### Install uv

```bash
# macOS/Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# Windows
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"

# Via pip (if you prefer)
pip install uv
```

### Setup Project

```bash
# Quick setup (recommended)
make setup

# Manual setup
uv venv          # Create virtual environment
uv sync          # Install all dependencies
```

## Common Commands

### Before (pip/venv)

```bash
# Setup
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Run scripts
source venv/bin/activate
python -m src.main jira

# Add dependencies
pip install some-package
pip freeze > requirements.txt
```

### After (uv)

```bash
# Setup
uv venv
uv sync

# Run scripts (no activation needed!)
uv run python -m src.main jira

# Or use Makefile
make cli-jira

# Add dependencies
uv add some-package

# Add dev dependencies
uv add --dev pytest
```

## Using the Makefile

All Makefile commands have been updated to use uv:

```bash
make setup          # Setup with uv
make chat           # Start chat (via uv run)
make cli-jira       # Run Jira CLI (via uv run)
make status         # Check project status
make clean-all      # Clean everything including .venv
```

## Developer Workflow

### Adding Dependencies

```bash
# Add a runtime dependency
uv add requests

# Add a dev dependency
uv add --dev pytest

# Dependencies are automatically added to pyproject.toml
# and uv.lock is updated
```

### Removing Dependencies

```bash
uv remove some-package
```

### Updating Dependencies

```bash
# Update all packages
uv sync --upgrade

# Update specific package
uv add --upgrade requests
```

### Running Scripts

```bash
# No need to activate virtualenv!
uv run python -m src.main jira
uv run python -m src.main confluence search "docs"

# Or use the Makefile (recommended)
make cli-jira
make chat
```

## Troubleshooting

### Old venv directory exists

If you have an old `venv/` directory:

```bash
make clean-all
make setup
```

### Dependencies not resolving

```bash
# Clear uv cache
uv cache clean

# Re-sync dependencies
uv sync --reinstall
```

### Command not found: uv

Make sure uv is in your PATH:

```bash
# Add to ~/.bashrc or ~/.zshrc
export PATH="$HOME/.cargo/bin:$PATH"

# Or reinstall uv
curl -LsSf https://astral.sh/uv/install.sh | sh
```

## Migration Checklist for Team Members

- [ ] Install uv: `curl -LsSf https://astral.sh/uv/install.sh | sh`
- [ ] Delete old venv: `rm -rf venv`
- [ ] Run setup: `make setup` or `uv sync`
- [ ] Verify installation: `uv run python -m src.main --help`
- [ ] Test your workflow: `make chat` or `make cli-jira`

## Benefits You'll Notice

1. **Faster installs**: Dependencies install 10-100x faster
2. **No activation needed**: `uv run` handles virtualenv automatically
3. **Better resolution**: Conflicts are caught and resolved properly
4. **Lock file**: Reproducible builds across environments
5. **Simpler workflow**: One tool for everything

## Documentation

- uv Official Docs: https://docs.astral.sh/uv/
- Project README: `README.md`
- Makefile Commands: `make help`

## Questions?

If you encounter any issues:

1. Check this migration guide
2. Run `make status` to see project state
3. Try `make clean-all && make setup`
4. Check the uv documentation: https://docs.astral.sh/uv/
