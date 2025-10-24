import React, { useState, useEffect } from 'react';
import { Folder } from 'lucide-react';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { useToast } from '../ui/Toast';
import { API_BASE_URL } from '../../config/api';
import { validatePath } from '../../utils/formValidation';
import { getUserFriendlyErrorMessage } from '../../utils/apiErrorHandler';

export default function LibrarySettings() {
  const [libraryPath, setLibraryPath] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const { showToast } = useToast();

  useEffect(() => {
    loadLibraryPath();
  }, []);

  const loadLibraryPath = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/config/library-path`);
      if (response.ok) {
        const data = await response.json();
        setLibraryPath(data.path || '');
      }
    } catch (error) {
      console.error('Failed to load library path:', error);
      showToast('error', 'Failed to load library path configuration');
    }
  };

  const handleSave = async () => {
    // Validate path
    const validation = validatePath(libraryPath);
    if (!validation.isValid) {
      setError(validation.error);
      showToast('error', validation.error || 'Please enter a valid library path');
      return;
    }

    setIsLoading(true);
    setError(undefined);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/config/library-path`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: libraryPath }),
      });

      if (response.ok) {
        showToast('success', 'Library path saved successfully');
      } else {
        const errorData = await response.json();
        const message = getUserFriendlyErrorMessage(errorData, 'Library path');
        showToast('error', message, {
          action: {
            label: 'Retry',
            onClick: handleSave,
          },
        });
      }
    } catch (error) {
      const message = getUserFriendlyErrorMessage(error, 'Library path');
      showToast('error', message, {
        action: {
          label: 'Retry',
          onClick: handleSave,
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBrowse = async () => {
    // In a real Electron app, this would use dialog.showOpenDialog
    // For now, we'll just show a message
    showToast('info', 'Folder picker will be available in the Electron build');
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Library Path</h2>
      <div className="space-y-4">
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              label="Music Folder"
              type="text"
              placeholder="C:\Music"
              value={libraryPath}
              onChange={(e) => {
                setLibraryPath(e.target.value);
                if (error) {
                  setError(undefined);
                }
              }}
              error={error}
            />
          </div>
          <div className="flex items-end">
            <Button onClick={handleBrowse} variant="secondary">
              <Folder className="h-4 w-4 mr-2" />
              Browse
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Specify the folder where your music library is stored. The application will scan this folder to discover artists and albums.
        </p>
        <Button onClick={handleSave} isLoading={isLoading}>
          Save Path
        </Button>
      </div>
    </div>
  );
}
