import { autoUpdater, UpdateInfo } from 'electron-updater';
import { BrowserWindow } from 'electron';
import log from 'electron-log';

export class AutoUpdateService {
  private mainWindow: BrowserWindow | null = null;
  private updateCheckInterval: NodeJS.Timeout | null = null;
  private isCheckingForUpdates = false;

  constructor() {
    // Configure electron-log for auto-updater
    log.transports.file.level = 'info';
    autoUpdater.logger = log;

    // Configure auto-updater
    autoUpdater.autoDownload = false; // Don't auto-download, ask user first
    autoUpdater.autoInstallOnAppQuit = true; // Install when app quits

    this.setupEventHandlers();
  }

  /**
   * Set the main window reference for sending update notifications
   */
  setMainWindow(window: BrowserWindow) {
    this.mainWindow = window;
  }

  /**
   * Setup event handlers for auto-updater
   */
  private setupEventHandlers() {
    // Update available
    autoUpdater.on('update-available', (info: UpdateInfo) => {
      log.info('Update available:', info);
      this.notifyRenderer('update-available', {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes,
      });
    });

    // Update not available
    autoUpdater.on('update-not-available', (info: UpdateInfo) => {
      log.info('Update not available:', info);
      this.notifyRenderer('update-not-available', {
        version: info.version,
      });
    });

    // Update downloaded
    autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
      log.info('Update downloaded:', info);
      this.notifyRenderer('update-downloaded', {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes,
      });
    });

    // Download progress
    autoUpdater.on('download-progress', (progressObj) => {
      log.info('Download progress:', progressObj);
      this.notifyRenderer('update-download-progress', {
        percent: progressObj.percent,
        bytesPerSecond: progressObj.bytesPerSecond,
        transferred: progressObj.transferred,
        total: progressObj.total,
      });
    });

    // Error occurred
    autoUpdater.on('error', (error) => {
      log.error('Auto-updater error:', error);
      this.notifyRenderer('update-error', {
        message: error.message,
      });
    });
  }

  /**
   * Send notification to renderer process
   */
  private notifyRenderer(channel: string, data: any) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data);
    }
  }

  /**
   * Check for updates manually
   */
  async checkForUpdates(): Promise<void> {
    if (this.isCheckingForUpdates) {
      log.info('Update check already in progress');
      return;
    }

    try {
      this.isCheckingForUpdates = true;
      log.info('Checking for updates...');
      
      // In development, skip update check
      if (process.env.NODE_ENV === 'development') {
        log.info('Skipping update check in development mode');
        this.notifyRenderer('update-not-available', {
          version: 'dev',
        });
        return;
      }

      await autoUpdater.checkForUpdates();
    } catch (error) {
      log.error('Error checking for updates:', error);
      this.notifyRenderer('update-error', {
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      this.isCheckingForUpdates = false;
    }
  }

  /**
   * Download the available update
   */
  async downloadUpdate(): Promise<void> {
    try {
      log.info('Starting update download...');
      await autoUpdater.downloadUpdate();
    } catch (error) {
      log.error('Error downloading update:', error);
      this.notifyRenderer('update-error', {
        message: error instanceof Error ? error.message : 'Failed to download update',
      });
    }
  }

  /**
   * Install the downloaded update and restart the app
   */
  quitAndInstall(): void {
    try {
      log.info('Quitting and installing update...');
      autoUpdater.quitAndInstall(false, true);
    } catch (error) {
      log.error('Error installing update:', error);
      this.notifyRenderer('update-error', {
        message: error instanceof Error ? error.message : 'Failed to install update',
      });
    }
  }

  /**
   * Start periodic update checks (every 4 hours)
   */
  startPeriodicChecks(): void {
    // Check immediately on startup
    setTimeout(() => {
      this.checkForUpdates();
    }, 5000); // Wait 5 seconds after startup

    // Then check every 4 hours
    this.updateCheckInterval = setInterval(() => {
      this.checkForUpdates();
    }, 4 * 60 * 60 * 1000); // 4 hours

    log.info('Periodic update checks started');
  }

  /**
   * Stop periodic update checks
   */
  stopPeriodicChecks(): void {
    if (this.updateCheckInterval) {
      clearInterval(this.updateCheckInterval);
      this.updateCheckInterval = null;
      log.info('Periodic update checks stopped');
    }
  }

  /**
   * Get current version
   */
  getCurrentVersion(): string {
    return autoUpdater.currentVersion.version;
  }
}

// Export singleton instance
export const autoUpdateService = new AutoUpdateService();
