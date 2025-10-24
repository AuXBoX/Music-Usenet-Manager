import { useEffect, useState } from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { useToast } from './ui/Toast';
import { ScanProgress } from '../../shared/types';
import { getUserFriendlyErrorMessage } from '../utils/apiErrorHandler';

interface ScanLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartScan: () => void;
}

export default function ScanLibraryModal({ isOpen, onClose, onStartScan }: ScanLibraryModalProps) {
  const [scanProgress, setScanProgress] = useState<ScanProgress | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (!isOpen) {
      setScanProgress(null);
      setIsScanning(false);
      return;
    }

    // Poll for scan progress
    const pollProgress = async () => {
      try {
        const response = await fetch('/api/library/scan/status');
        if (response.ok) {
          const progress: ScanProgress = await response.json();
          setScanProgress(progress);
          setIsScanning(progress.isScanning);
          
          // If scan is complete, stop polling
          if (!progress.isScanning && progress.filesProcessed > 0) {
            return false; // Stop polling
          }
        } else {
          const error = await response.json();
          const message = getUserFriendlyErrorMessage(error, 'Scan progress');
          showToast('error', message);
          return false; // Stop polling on error
        }
      } catch (error) {
        console.error('Failed to fetch scan progress:', error);
        const message = getUserFriendlyErrorMessage(error, 'Scan progress');
        showToast('error', message);
        return false; // Stop polling on error
      }
      return true; // Continue polling
    };

    let intervalId: NodeJS.Timeout | null = null;
    
    if (isScanning || (scanProgress && scanProgress.isScanning)) {
      intervalId = setInterval(async () => {
        const shouldContinue = await pollProgress();
        if (!shouldContinue && intervalId) {
          clearInterval(intervalId);
        }
      }, 500);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isOpen, isScanning, scanProgress]);

  const handleStartScan = async () => {
    setIsScanning(true);
    onStartScan();
  };

  const handleClose = () => {
    if (!isScanning) {
      onClose();
    }
  };

  const scanComplete = scanProgress && !scanProgress.isScanning && scanProgress.filesProcessed > 0;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Scan Music Library" size="md">
      <div className="space-y-4">
        {!scanProgress && !isScanning && (
          <div className="text-center py-4">
            <p className="text-muted-foreground mb-6">
              This will scan your music library folder and discover all artists and albums.
            </p>
            <Button onClick={handleStartScan}>
              Start Scan
            </Button>
          </div>
        )}

        {(isScanning || (scanProgress && scanProgress.isScanning)) && (
          <div className="space-y-4">
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
            
            <div className="space-y-2 text-center">
              <p className="text-sm text-muted-foreground">
                {scanProgress?.currentFile || 'Scanning...'}
              </p>
              
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="bg-card border border-border rounded-lg p-3">
                  <div className="text-2xl font-bold text-primary">
                    {scanProgress?.filesProcessed || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Files Processed</div>
                </div>
                
                <div className="bg-card border border-border rounded-lg p-3">
                  <div className="text-2xl font-bold text-primary">
                    {scanProgress?.artistsFound || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Artists Found</div>
                </div>
                
                <div className="bg-card border border-border rounded-lg p-3">
                  <div className="text-2xl font-bold text-primary">
                    {scanProgress?.albumsFound || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Albums Found</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {scanComplete && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/10 rounded-full mb-4">
                <svg
                  className="h-8 w-8 text-green-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              
              <h3 className="text-xl font-semibold mb-2">Scan Complete!</h3>
              
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="bg-card border border-border rounded-lg p-3">
                  <div className="text-2xl font-bold text-primary">
                    {scanProgress.filesProcessed}
                  </div>
                  <div className="text-xs text-muted-foreground">Files Processed</div>
                </div>
                
                <div className="bg-card border border-border rounded-lg p-3">
                  <div className="text-2xl font-bold text-primary">
                    {scanProgress.artistsFound}
                  </div>
                  <div className="text-xs text-muted-foreground">Artists Found</div>
                </div>
                
                <div className="bg-card border border-border rounded-lg p-3">
                  <div className="text-2xl font-bold text-primary">
                    {scanProgress.albumsFound}
                  </div>
                  <div className="text-xs text-muted-foreground">Albums Found</div>
                </div>
              </div>

              {scanProgress.errors.length > 0 && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-left">
                  <p className="text-sm font-medium text-red-500 mb-2">
                    Errors encountered:
                  </p>
                  <ul className="text-xs text-red-400 space-y-1 max-h-32 overflow-y-auto">
                    {scanProgress.errors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            
            <div className="flex justify-end">
              <Button onClick={handleClose}>
                Close
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
