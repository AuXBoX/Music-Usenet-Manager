# Setup Instructions

## Installing Node.js

Before you can run this project, you need to install Node.js:

1. Download Node.js from: https://nodejs.org/
2. Choose the LTS (Long Term Support) version
3. Run the installer and follow the installation wizard
4. Verify installation by opening a new terminal and running:
   ```bash
   node --version
   npm --version
   ```

## Project Setup

Once Node.js is installed, follow these steps:

1. Open a terminal in the project directory

2. Install all dependencies:
   ```bash
   npm install
   ```

3. Run the application in development mode:
   ```bash
   npm run dev
   ```

## Build Scripts

- `npm run dev` - Start development mode with hot reload
- `npm run build` - Build for production
- `npm run package:win` - Create Windows installer

## Troubleshooting

### npm command not found
- Make sure Node.js is installed correctly
- Restart your terminal after installation
- Check that Node.js is in your system PATH

### Port already in use
- The frontend runs on port 3000 and backend on port 3001
- Make sure these ports are available
- You can change ports in vite.config.ts and src/main/server.ts

### Build errors
- Delete node_modules folder and run `npm install` again
- Clear npm cache: `npm cache clean --force`
