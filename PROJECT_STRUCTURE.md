# Project Structure Overview

## Complete Directory Structure

```
music-usenet-manager/
├── .kiro/                          # Kiro spec files
│   └── specs/
│       └── music-usenet-manager/
│           ├── requirements.md
│           ├── design.md
│           └── tasks.md
│
├── build/                          # Build resources
│   └── icon.ico                    # (Add your app icon here)
│
├── src/
│   ├── main/                       # Electron main process (Backend)
│   │   ├── database/               # SQLite database setup
│   │   ├── routes/                 # Express API routes
│   │   ├── services/               # Business logic services
│   │   ├── main.ts                 # Electron entry point
│   │   ├── server.ts               # Express server setup
│   │   └── preload.ts              # Electron preload script
│   │
│   ├── renderer/                   # React frontend
│   │   ├── components/             # Reusable UI components
│   │   ├── pages/                  # Page components
│   │   ├── lib/                    # Utility functions
│   │   │   └── utils.ts            # Helper utilities
│   │   ├── App.tsx                 # Main React component
│   │   ├── main.tsx                # React entry point
│   │   ├── index.html              # HTML template
│   │   └── index.css               # Global styles (Tailwind)
│   │
│   └── shared/                     # Shared TypeScript types
│       └── types.ts                # Common interfaces
│
├── dist/                           # Build output (generated)
│   ├── main/                       # Compiled backend code
│   └── renderer/                   # Compiled frontend code
│
├── release/                        # Packaged installers (generated)
│
├── node_modules/                   # Dependencies (generated)
│
├── .gitignore                      # Git ignore rules
├── electron-builder.json           # Electron builder config
├── LICENSE.txt                     # MIT License
├── package.json                    # Project dependencies & scripts
├── postcss.config.js               # PostCSS configuration
├── README.md                       # Project documentation
├── SETUP.md                        # Setup instructions
├── tailwind.config.js              # Tailwind CSS configuration
├── tsconfig.json                   # TypeScript config (renderer)
├── tsconfig.main.json              # TypeScript config (main)
├── tsconfig.node.json              # TypeScript config (node)
└── vite.config.ts                  # Vite bundler configuration
```

## Key Configuration Files

### package.json
- Defines project dependencies
- Contains build and development scripts
- Specifies Electron entry point

### tsconfig.json (3 files)
- `tsconfig.json`: Frontend React/TypeScript configuration
- `tsconfig.main.json`: Backend Node.js/Electron configuration
- `tsconfig.node.json`: Build tools configuration

### vite.config.ts
- Configures Vite bundler for React frontend
- Sets up path aliases (@shared, @renderer)
- Defines build output directories

### electron-builder.json
- Windows installer configuration
- NSIS installer settings
- Application metadata

### tailwind.config.js
- Tailwind CSS theme configuration
- Dark mode setup
- Custom color scheme (shadcn/ui compatible)

## Technology Stack

### Frontend
- **React 18**: UI framework
- **TypeScript**: Type safety
- **Tailwind CSS**: Utility-first styling
- **shadcn/ui**: Component library (to be added)
- **React Router**: Navigation
- **Vite**: Fast build tool

### Backend
- **Node.js**: Runtime environment
- **Express**: Web server framework
- **better-sqlite3**: SQLite database
- **music-metadata**: Audio file parsing
- **axios**: HTTP client
- **node-cron**: Task scheduling

### Desktop
- **Electron**: Desktop app framework
- **electron-builder**: Packaging tool

## Next Steps

1. **Install Node.js** (see SETUP.md)
2. **Run `npm install`** to install dependencies
3. **Add app icon** to `build/icon.ico`
4. **Start development** with `npm run dev`
5. **Implement Task 2** from tasks.md (Database layer)

## Development Workflow

1. Make changes to source files in `src/`
2. Frontend changes hot-reload automatically
3. Backend changes require restart
4. Build with `npm run build`
5. Package with `npm run package:win`

## Port Configuration

- **Frontend Dev Server**: http://localhost:3000 (Vite)
- **Backend API Server**: http://localhost:3001 (Express)

## Important Notes

- The `dist/` and `release/` folders are generated during build
- Never commit `node_modules/`, `dist/`, or `release/`
- Database files (*.db) are gitignored
- User data will be stored in `%APPDATA%\music-usenet-manager\`
