import { ipcMain, app, BrowserWindow } from 'electron';
import { getMonitoringService } from '../server';
import { setupAutoUpdateHandlers, removeAutoUpdateHandlers } from './autoUpdateHandlers';

export function setupIpcHandlers(mainWindow: BrowserWindow): void {
  // Setup auto-update handlers
  setupAutoUpdateHandlers(mainWindow);
  // Get app version
  ipcMain.handle('app:getVersion', () => {
    return app.getVersion();
  });

  // Get app path
  ipcMain.handle('app:getPath', (_event, name: string) => {
    return app.getPath(name as any);
  });

  // Window controls
  ipcMain.handle('window:minimize', () => {
    mainWindow.minimize();
  });

  ipcMain.handle('window:maximize', () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
    return mainWindow.isMaximized();
  });

  ipcMain.handle('window:close', () => {
    mainWindow.close();
  });

  ipcMain.handle('window:isMaximized', () => {
    return mainWindow.isMaximized();
  });

  // Show/hide window
  ipcMain.handle('window:show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  ipcMain.handle('window:hide', () => {
    mainWindow.hide();
  });

  // Monitoring service controls
  ipcMain.handle('monitoring:checkNow', async () => {
    const monitoringService = getMonitoringService();
    if (monitoringService) {
      await monitoringService.checkForNewReleases();
      return { success: true };
    }
    return { success: false, error: 'Monitoring service not available' };
  });

  // Open external links
  ipcMain.handle('shell:openExternal', async (_event, url: string) => {
    const { shell } = require('electron');
    await shell.openExternal(url);
  });

  // Dialog operations
  ipcMain.handle('dialog:selectFolder', async () => {
    const { dialog } = require('electron');
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
    });
    return result.filePaths[0] || null;
  });
}

export function removeIpcHandlers(): void {
  ipcMain.removeHandler('app:getVersion');
  ipcMain.removeHandler('app:getPath');
  ipcMain.removeHandler('window:minimize');
  ipcMain.removeHandler('window:maximize');
  ipcMain.removeHandler('window:close');
  ipcMain.removeHandler('window:isMaximized');
  ipcMain.removeHandler('window:show');
  ipcMain.removeHandler('window:hide');
  ipcMain.removeHandler('monitoring:checkNow');
  ipcMain.removeHandler('shell:openExternal');
  ipcMain.removeHandler('dialog:selectFolder');
  
  // Remove auto-update handlers
  removeAutoUpdateHandlers();
}
