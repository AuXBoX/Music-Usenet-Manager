import { useEffect, useState } from 'react';
import { X, Download, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';

interface UpdateInfo {
  version: string;
  releaseDate?: string;
  releaseNotes?: string;
}

interface UpdateDownloadProgress {
  percent: number;
  bytesPerSecond: number;
  transferred: number;
  total: number;
}

type UpdateState = 
  | { type: 'idle' }
  | { type: 'checking' }
  | { type: 'available'; info: UpdateInfo }
  | { type: 'downloading'; progress: UpdateDownloadProgress }
  | { type: 'downloaded'; info: UpdateInfo }
  | { type: 'error'; message: string }
  | { type: 'not-available' };

export function UpdateNotification() {
  const [updateState, setUpdateState] = useState<UpdateState>({ type: 'idle' });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Setup event listeners
    const removeUpdateAvailable = window.electron.autoUpdate.onUpdateAvailable((info) => {
      setUpdateState({ type: 'available', info });
      setIsVisible(true);
    });

    const removeUpdateNotAvailable = window.electron.autoUpdate.onUpdateNotAvailable(() => {
      setUpdateState({ type: 'not-available' });
      // Don't show notification for "no update available"
    });

    const removeUpdateDownloaded = window.electron.autoUpdate.onUpdateDownloaded((info) => {
      setUpdateState({ type: 'downloaded', info });
      setIsVisible(true);
    });

    const removeDownloadProgress = window.electron.autoUpdate.onDownloadProgress((progress) => {
      setUpdateState({ type: 'downloading', progress });
      setIsVisible(true);
    });

    const removeUpdateError = window.electron.autoUpdate.onUpdateError((error) => {
      setUpdateState({ type: 'error', message: error.message });
      setIsVisible(true);
    });

    // Cleanup listeners on unmount
    return () => {
      removeUpdateAvailable();
      removeUpdateNotAvailable();
      removeUpdateDownloaded();
      removeDownloadProgress();
      removeUpdateError();
    };
  }, []);

  const handleCheckForUpdates = async () => {
    setUpdateState({ type: 'checking' });
    setIsVisible(true);
    await window.electron.autoUpdate.checkForUpdates();
  };

  const handleDownloadUpdate = async () => {
    await window.electron.autoUpdate.downloadUpdate();
  };

  const handleInstallUpdate = async () => {
    await window.electron.autoUpdate.installUpdate();
  };

  const handleDismiss = () => {
    setIsVisible(false);
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatSpeed = (bytesPerSecond: number): string => {
    return formatBytes(bytesPerSecond) + '/s';
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 bg-gray-800 border border-gray-700 rounded-lg shadow-xl">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            {updateState.type === 'checking' && (
              <>
                <RefreshCw className="w-5 h-5 text-blue-400 animate-spin" />
                <h3 className="text-white font-semibold">Checking for Updates</h3>
              </>
            )}
            {updateState.type === 'available' && (
              <>
                <Download className="w-5 h-5 text-blue-400" />
                <h3 className="text-white font-semibold">Update Available</h3>
              </>
            )}
            {updateState.type === 'downloading' && (
              <>
                <Download className="w-5 h-5 text-blue-400 animate-pulse" />
                <h3 className="text-white font-semibold">Downloading Update</h3>
              </>
            )}
            {updateState.type === 'downloaded' && (
              <>
                <CheckCircle className="w-5 h-5 text-green-400" />
                <h3 className="text-white font-semibold">Update Ready</h3>
              </>
            )}
            {updateState.type === 'error' && (
              <>
                <AlertCircle className="w-5 h-5 text-red-400" />
                <h3 className="text-white font-semibold">Update Error</h3>
              </>
            )}
            {updateState.type === 'not-available' && (
              <>
                <CheckCircle className="w-5 h-5 text-green-400" />
                <h3 className="text-white font-semibold">Up to Date</h3>
              </>
            )}
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-3">
          {updateState.type === 'checking' && (
            <p className="text-gray-300 text-sm">
              Checking for available updates...
            </p>
          )}

          {updateState.type === 'available' && (
            <>
              <p className="text-gray-300 text-sm">
                Version {updateState.info.version} is available for download.
              </p>
              {updateState.info.releaseNotes && (
                <div className="text-gray-400 text-xs max-h-32 overflow-y-auto">
                  <p className="font-semibold mb-1">Release Notes:</p>
                  <div className="whitespace-pre-wrap">{updateState.info.releaseNotes}</div>
                </div>
              )}
              <button
                onClick={handleDownloadUpdate}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download Update
              </button>
            </>
          )}

          {updateState.type === 'downloading' && (
            <>
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-300">
                  <span>{Math.round(updateState.progress.percent)}%</span>
                  <span>{formatSpeed(updateState.progress.bytesPerSecond)}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${updateState.progress.percent}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-400">
                  <span>{formatBytes(updateState.progress.transferred)}</span>
                  <span>{formatBytes(updateState.progress.total)}</span>
                </div>
              </div>
            </>
          )}

          {updateState.type === 'downloaded' && (
            <>
              <p className="text-gray-300 text-sm">
                Version {updateState.info.version} has been downloaded and is ready to install.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleInstallUpdate}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition-colors"
                >
                  Restart & Install
                </button>
                <button
                  onClick={handleDismiss}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-md transition-colors"
                >
                  Later
                </button>
              </div>
            </>
          )}

          {updateState.type === 'error' && (
            <>
              <p className="text-red-300 text-sm">
                {updateState.message}
              </p>
              <button
                onClick={handleCheckForUpdates}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-md transition-colors"
              >
                Try Again
              </button>
            </>
          )}

          {updateState.type === 'not-available' && (
            <p className="text-gray-300 text-sm">
              You're running the latest version.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
