import { Link } from 'react-router-dom';
import { CheckCircle, XCircle, Clock, Loader2, ExternalLink } from 'lucide-react';
import { clsx } from 'clsx';
import { Download } from '../../shared/types';
import Badge from './ui/Badge';

interface DownloadItemProps {
  download: Download;
  albumTitle?: string;
  artistName?: string;
  artistId?: string;
}

export default function DownloadItem({ 
  download, 
  albumTitle = 'Unknown Album',
  artistName = 'Unknown Artist',
  artistId
}: DownloadItemProps) {
  const getStatusIcon = () => {
    switch (download.status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'downloading':
        return <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />;
      case 'queued':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      default:
        return null;
    }
  };

  const getStatusBadge = () => {
    switch (download.status) {
      case 'completed':
        return <Badge variant="success">Completed</Badge>;
      case 'failed':
        return <Badge variant="error">Failed</Badge>;
      case 'downloading':
        return <Badge variant="info">Downloading</Badge>;
      case 'queued':
        return <Badge variant="warning">Queued</Badge>;
      default:
        return null;
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 transition-smooth hover:border-primary/50 hover:shadow-md">
      <div className="flex items-start gap-4">
        {/* Status Icon */}
        <div className="flex-shrink-0 mt-1">
          {getStatusIcon()}
        </div>

        {/* Download Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base truncate" title={albumTitle}>
                {albumTitle}
              </h3>
              {artistId ? (
                <Link
                  to={`/artists/${artistId}`}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
                >
                  {artistName}
                  <ExternalLink className="h-3 w-3" />
                </Link>
              ) : (
                <p className="text-sm text-muted-foreground">{artistName}</p>
              )}
            </div>
            
            {/* Status Badge */}
            <div className="flex-shrink-0">
              {getStatusBadge()}
            </div>
          </div>

          {/* Progress Bar (for active downloads) */}
          {(download.status === 'downloading' || download.status === 'queued') && (
            <div className="mb-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>Progress</span>
                <span>{download.progress}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className={clsx(
                    'h-full transition-all duration-300',
                    download.status === 'downloading' ? 'bg-blue-600' : 'bg-yellow-600'
                  )}
                  style={{ width: `${download.progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Error Message */}
          {download.status === 'failed' && download.errorMessage && (
            <div className="mb-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-800 dark:text-red-400">
              {download.errorMessage}
            </div>
          )}

          {/* Metadata */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>Started: {formatDate(download.initiatedAt)}</span>
            {download.completedAt && (
              <span>Completed: {formatDate(download.completedAt)}</span>
            )}
            {download.indexerName && (
              <span>Indexer: {download.indexerName}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
