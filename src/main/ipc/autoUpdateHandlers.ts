import { ipcMain, BrowserWindow } from 'electron';
import { autoUpdateService } from '../services/AutoUpdateService';

/**
 * Setup IPC handlers for auto-update functionality
 */
export function setupAutoUpdateHandlers(mainWindow: BrowserWindow) {
  // Set main window reference
  autoUpdateService.setMainWindow(mainWindow);

  // Check for updates
  ipcMain.handle('auto-update:check', async () => {
    try {
      await autoUpdateService.checkForUpdates();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check for updates',
      };
    }
  });

  // Download update
  ipcMain.handle('auto-update:download', async () => {
    try {
      await autoUpdateService.downloadUpdate();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to download update',
      };
    }
  });

  // Install update
  ipcMain.handle('auto-update:install', () => {
    try {
      autoUpdateService.quitAndInstall();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to install update',
      };
    }
  });

  // Get current version
  ipcMain.handle('auto-update:get-version', () => {
    return {
      success: true,
      version: autoUpdateService.getCurrentVersion(),
    };
  });
}

/**
 * Remove IPC handlers for auto-update functionality
 */
export function removeAutoUpdateHandlers() {
  ipcMain.removeHandler('auto-update:check');
  ipcMain.removeHandler('auto-update:download');
  ipcMain.removeHandler('auto-update:install');
  ipcMain.removeHandler('auto-update:get-version');
}
