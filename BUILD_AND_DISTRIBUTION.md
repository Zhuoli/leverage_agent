# Build and Distribution Guide

This guide explains how to build and distribute the Atlassian AI Assistant as a native Mac, Windows, or Linux application.

## Table of Contents

- [Quick Start](#quick-start)
- [Local Building](#local-building)
- [Automated Builds with GitHub Actions](#automated-builds-with-github-actions)
- [Creating Releases](#creating-releases)
- [Distribution](#distribution)
- [Code Signing (macOS)](#code-signing-macos)

---

## Quick Start

### Build Locally (Mac)

```bash
# Install dependencies
make setup

# Build the TypeScript code
make build

# Package as macOS .dmg installer
make package-mac
```

The installer will be in `electron-app/dist/Atlassian AI Assistant-3.0.0.dmg`

### Build via GitHub Actions (Recommended for Releases)

1. Push a version tag to trigger automatic builds:
   ```bash
   git tag v3.0.0
   git push origin v3.0.0
   ```

2. GitHub Actions will automatically:
   - Build for macOS, Windows, and Linux
   - Create a GitHub Release
   - Upload installers as release assets

---

## Local Building

### Prerequisites

- **Node.js** 18+ and npm 9+
- **Platform-specific requirements**:
  - **macOS**: Xcode Command Line Tools (`xcode-select --install`)
  - **Windows**: Windows SDK
  - **Linux**: Build tools (`sudo apt install build-essential`)

### Build Commands

Using Make (recommended):

```bash
# Build for current platform
make package

# Build for specific platforms
make package-mac      # macOS .dmg
make package-win      # Windows .exe
make package-linux    # Linux .AppImage and .deb

# Build for all platforms (requires cross-compilation setup)
make package-all
```

Using npm directly:

```bash
# Install dependencies
npm install
cd electron-app && npm install

# Build TypeScript
npm run build

# Package the app
cd electron-app
npm run build:mac     # macOS
npm run build:win     # Windows
npm run build:linux   # Linux
```

### Output Locations

All installers are created in `electron-app/dist/`:

- **macOS**: `*.dmg` and `*.zip`
- **Windows**: `*.exe`
- **Linux**: `*.AppImage` and `*.deb`

---

## Automated Builds with GitHub Actions

The repository includes two GitHub Actions workflows:

### 1. Build Workflow (`.github/workflows/build.yml`)

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main`
- Manual trigger via GitHub UI

**What it does:**
- Builds the application for macOS (on every push/PR)
- Optionally builds for Windows/Linux (manual trigger only)
- Uploads build artifacts (available for 7 days)

**Manual Trigger:**
1. Go to **Actions** tab on GitHub
2. Select **Build Application** workflow
3. Click **Run workflow**
4. Choose platform (mac/windows/linux/all)

### 2. Release Workflow (`.github/workflows/release.yml`)

**Triggers:**
- Push a version tag (e.g., `v3.0.0`)
- Manual trigger via GitHub UI

**What it does:**
- Creates a GitHub Release
- Builds installers for macOS, Windows, and Linux
- Uploads installers to the release

**How to trigger:**

```bash
# Create and push a version tag
git tag v3.0.0
git push origin v3.0.0
```

GitHub Actions will automatically:
1. Create a release draft
2. Build all platform installers
3. Upload them to the release
4. Publish the release

---

## Creating Releases

### Automated Release Process (Recommended)

1. **Update version** in both `package.json` files:
   ```bash
   # Root package.json
   vim package.json  # Update "version": "3.0.0"

   # Electron package.json
   vim electron-app/package.json  # Update "version": "3.0.0"
   ```

2. **Commit the version bump**:
   ```bash
   git add package.json electron-app/package.json
   git commit -m "Bump version to 3.0.0"
   git push
   ```

3. **Create and push a version tag**:
   ```bash
   git tag v3.0.0
   git push origin v3.0.0
   ```

4. **Wait for GitHub Actions** to complete (check the Actions tab)

5. **Check the release** at `https://github.com/zhuoli/confluence_assistant/releases`

### Manual Release Process

If you prefer to create releases manually:

1. Build locally for all platforms
2. Go to GitHub → Releases → Draft a new release
3. Create a new tag (e.g., `v3.0.0`)
4. Upload the installers from `electron-app/dist/`
5. Write release notes
6. Publish

---

## Distribution

### Distribution Methods

#### 1. GitHub Releases (Easiest)

- Users download installers from: `https://github.com/zhuoli/confluence_assistant/releases`
- GitHub automatically hosts files
- No additional infrastructure needed

#### 2. Direct Download Links

Share direct links to release assets:
```
https://github.com/zhuoli/confluence_assistant/releases/download/v3.0.0/Atlassian-AI-Assistant-3.0.0-mac.dmg
```

#### 3. Self-Hosted Distribution

Upload installers to your own server/CDN and share download links.

### Installation Instructions for Users

**macOS:**
1. Download the `.dmg` file
2. Open the DMG
3. Drag the app to Applications folder
4. Open from Applications (first time: Right-click → Open)

**Windows:**
1. Download the `.exe` file
2. Run the installer
3. Follow installation wizard

**Linux:**
- **AppImage**: `chmod +x *.AppImage && ./Atlassian-AI-Assistant-*.AppImage`
- **Debian/Ubuntu**: `sudo dpkg -i *.deb`

---

## Code Signing (macOS)

For distribution outside the App Store, you should code-sign your app.

### Prerequisites

1. **Apple Developer Account** ($99/year)
2. **Developer ID Application Certificate** from Apple
3. **App-specific password** for notarization

### Setup Code Signing

1. **Get your certificate identity**:
   ```bash
   security find-identity -v -p codesigning
   ```

2. **Update `electron-app/package.json`** with signing config:
   ```json
   {
     "build": {
       "mac": {
         "category": "public.app-category.productivity",
         "hardenedRuntime": true,
         "gatekeeperAssess": false,
         "entitlements": "build/entitlements.mac.plist",
         "entitlementsInherit": "build/entitlements.mac.plist",
         "target": ["dmg", "zip"]
       },
       "afterSign": "scripts/notarize.js"
     }
   }
   ```

3. **Set environment variables** for GitHub Actions:
   ```bash
   # In your repository settings → Secrets → Actions
   CSC_LINK=<base64-encoded-certificate>
   CSC_KEY_PASSWORD=<certificate-password>
   APPLE_ID=<your-apple-id>
   APPLE_ID_PASSWORD=<app-specific-password>
   APPLE_TEAM_ID=<your-team-id>
   ```

4. **Update the release workflow** to use signing:
   ```yaml
   - name: Build macOS app
     run: cd electron-app && npm run build:mac
     env:
       CSC_LINK: ${{ secrets.CSC_LINK }}
       CSC_KEY_PASSWORD: ${{ secrets.CSC_KEY_PASSWORD }}
       APPLE_ID: ${{ secrets.APPLE_ID }}
       APPLE_ID_PASSWORD: ${{ secrets.APPLE_ID_PASSWORD }}
       APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
   ```

### Without Code Signing

If you don't have a Developer ID, users will need to:
1. Right-click the app
2. Select "Open"
3. Confirm in the security dialog

---

## Troubleshooting

### Build Fails on GitHub Actions

- **Check Node version**: Ensure workflow uses Node 18+
- **Check dependencies**: Verify `package-lock.json` is committed
- **Check logs**: View detailed logs in GitHub Actions tab

### DMG File Won't Open

- Rebuild with: `make clean && make package-mac`
- Ensure icon files exist: `electron-app/assets/icon.icns`

### Windows/Linux Builds Don't Work on macOS

- Use GitHub Actions (different runners for each OS)
- OR: Set up Docker for cross-platform builds
- OR: Use a VM/CI service for other platforms

### App Won't Open (macOS Security)

Users need to:
1. System Preferences → Security & Privacy
2. Click "Open Anyway" for the app
3. OR: Right-click app → Open

---

## Next Steps

- ✅ Set up GitHub Actions workflows (Done!)
- ⬜ Configure code signing for macOS
- ⬜ Add auto-update functionality (Electron Updater)
- ⬜ Set up crash reporting
- ⬜ Create installer customizations (license, welcome screens)

---

## Resources

- [Electron Builder Docs](https://www.electron.build/)
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Code Signing Guide](https://www.electron.build/code-signing)
- [Notarization Guide](https://kilianvalkhof.com/2019/electron/notarizing-your-electron-application/)
