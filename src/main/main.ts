import { app, BrowserWindow, Tray, Menu, nativeImage } from 'electron';
import path from 'path';
import { startServer, stopMonitoringService } from './server';
import { initializeDatabase, closeDatabaseService } from './database';
import { WindowStateManager } from './WindowStateManager';
import { setupIpcHandlers, removeIpcHandlers } from './ipc/handlers';
import { autoUpdateService } from './services/AutoUpdateService';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let windowStateManager: WindowStateManager | null = null;
let isQuitting = false;

function createTray() {
  // Create tray icon
  const iconPath = process.env.NODE_ENV === 'development'
    ? path.join(__dirname, '../../build/icon.png')
    : path.join(process.resourcesPath, 'icon.png');

  // Create a native image for the tray icon
  let trayIcon;
  try {
    trayIcon = nativeImage.createFromPath(iconPath);
    if (trayIcon.isEmpty()) {
      // Fallback to a simple icon if file doesn't exist
      trayIcon = nativeImage.createEmpty();
    }
  } catch (error) {
    console.warn('Could not load tray icon, using empty icon:', error);
    trayIcon = nativeImage.createEmpty();
  }

  tray = new Tray(trayIcon);
  tray.setToolTip('Music Usenet Manager');

  // Create context menu
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show App',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    {
      label: 'Hide App',
      click: () => {
        if (mainWindow) {
          mainWindow.hide();
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  // Double-click to show/hide window
  tray.on('double-click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });
}

function createWindow() {
  // Initialize window state manager
  windowStateManager = new WindowStateManager();
  const windowState = windowStateManager.getState();

  mainWindow = new BrowserWindow({
    x: windowState.x,
    y: windowState.y,
    width: windowState.width,
    height: windowState.height,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, '../../build/icon.png'),
    show: false, // Don't show until ready
  });

  // Manage window state
  windowStateManager.manage(mainWindow);

  // Set up IPC handlers
  setupIpcHandlers(mainWindow);

  // In development, load from Vite dev server
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load from built files
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
      
      // Start periodic update checks after window is ready
      autoUpdateService.startPeriodicChecks();
    }
  });

  // Handle window close - minimize to tray instead of closing
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      if (mainWindow) {
        mainWindow.hide();
      }
      return false;
    }
    return true;
  });

  mainWindow.on('closed', () => {
    if (windowStateManager) {
      windowStateManager.unmanage();
      windowStateManager = null;
    }
    removeIpcHandlers();
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  try {
    // Initialize database
    console.log('Initializing database...');
    await initializeDatabase();
    console.log('Database initialized successfully');

    // Start the Express server
    console.log('Starting Express server...');
    await startServer();
    console.log('Express server started successfully');
    
    // Create system tray
    createTray();
    console.log('System tray created');

    // Create main window
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      } else if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      }
    });
  } catch (error) {
    console.error('Failed to initialize application:', error);
    app.quit();
  }
});

// Prevent app from quitting when all windows are closed (keep in tray)
app.on('window-all-closed', () => {
  // Don't quit the app on Windows/Linux, keep running in tray
  // On macOS, it's common to keep the app running even with no windows
  if (process.platform !== 'darwin') {
    // Don't quit, just keep running in tray
  }
});

app.on('before-quit', () => {
  isQuitting = true;
  
  // Stop auto-update checks
  autoUpdateService.stopPeriodicChecks();
  
  // Stop monitoring service
  stopMonitoringService();
  
  // Clean up database connection
  closeDatabaseService();
  
  // Clean up tray
  if (tray) {
    tray.destroy();
    tray = null;
  }
});
