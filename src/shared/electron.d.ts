export interface UpdateInfo {
  version: string;
  releaseDate?: string;
  releaseNotes?: string;
}

export interface UpdateDownloadProgress {
  percent: number;
  bytesPerSecond: number;
  transferred: number;
  total: number;
}

export interface ElectronAPI {
  // App methods
  getVersion: () => Promise<string>;
  getPath: (name: string) => Promise<string>;

  // Window controls
  minimizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<boolean>;
  closeWindow: () => Promise<void>;
  isMaximized: () => Promise<boolean>;
  showWindow: () => Promise<void>;
  hideWindow: () => Promise<void>;

  // Monitoring service
  checkForNewReleases: () => Promise<{ success: boolean; error?: string }>;

  // Shell operations
  openExternal: (url: string) => Promise<void>;

  // Dialog operations
  selectFolder: () => Promise<string | null>;

  // Auto-update methods
  autoUpdate: {
    checkForUpdates: () => Promise<{ success: boolean; error?: string }>;
    downloadUpdate: () => Promise<{ success: boolean; error?: string }>;
    installUpdate: () => Promise<{ success: boolean; error?: string }>;
    getCurrentVersion: () => Promise<{ success: boolean; version?: string }>;
    onUpdateAvailable: (callback: (info: UpdateInfo) => void) => () => void;
    onUpdateNotAvailable: (callback: (info: UpdateInfo) => void) => () => void;
    onUpdateDownloaded: (callback: (info: UpdateInfo) => void) => () => void;
    onDownloadProgress: (callback: (progress: UpdateDownloadProgress) => void) => () => void;
    onUpdateError: (callback: (error: { message: string }) => void) => () => void;
  };
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}

export {};
