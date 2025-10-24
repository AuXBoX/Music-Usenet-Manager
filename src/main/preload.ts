import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  // App methods
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  getPath: (name: string) => ipcRenderer.invoke('app:getPath', name),

  // Window controls
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  showWindow: () => ipcRenderer.invoke('window:show'),
  hideWindow: () => ipcRenderer.invoke('window:hide'),

  // Monitoring service
  checkForNewReleases: () => ipcRenderer.invoke('monitoring:checkNow'),

  // Shell operations
  openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),

  // Dialog operations
  selectFolder: () => ipcRenderer.invoke('dialog:selectFolder'),

  // Auto-update API
  autoUpdate: {
    checkForUpdates: () => ipcRenderer.invoke('auto-update:check'),
    downloadUpdate: () => ipcRenderer.invoke('auto-update:download'),
    installUpdate: () => ipcRenderer.invoke('auto-update:install'),
    getCurrentVersion: () => ipcRenderer.invoke('auto-update:get-version'),
    
    // Event listeners
    onUpdateAvailable: (callback: (info: any) => void) => {
      const listener = (_event: any, info: any) => callback(info);
      ipcRenderer.on('update-available', listener);
      return () => ipcRenderer.removeListener('update-available', listener);
    },
    onUpdateNotAvailable: (callback: (info: any) => void) => {
      const listener = (_event: any, info: any) => callback(info);
      ipcRenderer.on('update-not-available', listener);
      return () => ipcRenderer.removeListener('update-not-available', listener);
    },
    onUpdateDownloaded: (callback: (info: any) => void) => {
      const listener = (_event: any, info: any) => callback(info);
      ipcRenderer.on('update-downloaded', listener);
      return () => ipcRenderer.removeListener('update-downloaded', listener);
    },
    onDownloadProgress: (callback: (progress: any) => void) => {
      const listener = (_event: any, progress: any) => callback(progress);
      ipcRenderer.on('update-download-progress', listener);
      return () => ipcRenderer.removeListener('update-download-progress', listener);
    },
    onUpdateError: (callback: (error: any) => void) => {
      const listener = (_event: any, error: any) => callback(error);
      ipcRenderer.on('update-error', listener);
      return () => ipcRenderer.removeListener('update-error', listener);
    },
  },
});
