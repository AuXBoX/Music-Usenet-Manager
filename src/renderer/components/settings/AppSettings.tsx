import React, { useState, useEffect } from 'react';
import { RefreshCw, Info } from 'lucide-react';

export default function AppSettings() {
  const [currentVersion, setCurrentVersion] = useState<string>('');
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    // Get current version on mount
    const fetchVersion = async () => {
      try {
        const result = await window.electron.autoUpdate.getCurrentVersion();
        if (result.success && result.version) {
          setCurrentVersion(result.version);
        }
      } catch (error) {
        console.error('Failed to get version:', error);
      }
    };
    fetchVersion();
  }, []);

  const handleCheckForUpdates = async () => {
    setIsChecking(true);
    try {
      await window.electron.autoUpdate.checkForUpdates();
    } catch (error) {
      console.error('Failed to check for updates:', error);
    } finally {
      // Keep checking state for a bit to show feedback
      setTimeout(() => setIsChecking(false), 2000);
    }
  };

  return (
    <div className="bg-card rounded-lg p-6 border border-border">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <Info className="w-5 h-5" />
        Application
      </h2>

      <div className="space-y-4">
        {/* Version Info */}
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">
            Current Version
          </label>
          <div className="text-lg font-mono">
            {currentVersion || 'Loading...'}
          </div>
        </div>

        {/* Check for Updates Button */}
        <div>
          <button
            onClick={handleCheckForUpdates}
            disabled={isChecking}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
            {isChecking ? 'Checking...' : 'Check for Updates'}
          </button>
          <p className="text-sm text-muted-foreground mt-2">
            The application automatically checks for updates every 4 hours.
          </p>
        </div>

        {/* Auto-update Info */}
        <div className="bg-muted/50 rounded-md p-4 text-sm">
          <p className="text-muted-foreground">
            <strong>Auto-Update:</strong> When an update is available, you'll see a notification
            in the bottom-right corner. You can choose to download and install it immediately
            or postpone it for later.
          </p>
        </div>
      </div>
    </div>
  );
}
