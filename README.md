# Music Usenet Manager

A Windows desktop application for automating music discovery and downloading via Usenet.

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn

## Installation

1. Install dependencies:
```bash
npm install
```

## Development

Run the application in development mode:

```bash
npm run dev
```

This will start:
- Vite dev server for the React frontend (port 3000)
- Electron main process with the Express backend (port 3001)

## Building

Build the application for production:

```bash
npm run build
```

## Packaging

### Building the Windows Installer

1. **Create the application icon** (first time only):
   - Convert `build/icon.png` to `build/icon.ico`
   - See `build/ICON_INSTRUCTIONS.md` for detailed instructions

2. **Validate the build configuration**:
   ```bash
   npm run validate-build
   ```

3. **Build the installer**:
   ```bash
   npm run build-installer
   ```
   
   Or manually:
   ```bash
   npm run package:win
   ```

The installer will be created in the `release/` directory as:
```
Music Usenet Manager-Setup-1.0.0.exe
```

### Installer Features

- ✅ Custom installation directory
- ✅ Desktop and Start Menu shortcuts
- ✅ Auto-start with Windows
- ✅ System tray integration
- ✅ User data stored in `%APPDATA%\music-usenet-manager\`
- ✅ Uninstaller with option to keep user data

### Testing the Installer

For thorough testing, see:
- **Quick Start**: `docs/QUICK_START_INSTALLER.md`
- **Full Documentation**: `docs/WINDOWS_INSTALLER.md`
- **Testing Checklist**: `docs/INSTALLER_TESTING_CHECKLIST.md`

**Recommended**: Test on a clean Windows VM or Windows Sandbox before distribution.

## Project Structure

```
music-usenet-manager/
├── src/
│   ├── main/           # Electron main process & backend
│   │   ├── database/   # Database initialization
│   │   ├── routes/     # API routes
│   │   ├── services/   # Business logic services
│   │   ├── main.ts     # Electron entry point
│   │   ├── server.ts   # Express server
│   │   └── preload.ts  # Preload script
│   ├── renderer/       # React frontend
│   │   ├── components/ # UI components
│   │   ├── pages/      # Page components
│   │   ├── lib/        # Utilities
│   │   ├── App.tsx     # Main app component
│   │   └── main.tsx    # React entry point
│   └── shared/         # Shared types
├── dist/               # Build output
├── release/            # Packaged installers
└── build/              # Build resources (icons, etc.)
```

## Technology Stack

- **Frontend**: React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Node.js, Express, SQLite
- **Desktop**: Electron
- **Build**: Vite, electron-builder
