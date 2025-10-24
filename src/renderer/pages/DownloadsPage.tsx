import { useState, useEffect, useCallback } from 'react';
import { clsx } from 'clsx';
import { RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import DownloadItem from '../components/DownloadItem';
import Button from '../components/ui/Button';
import { DownloadItemSkeleton } from '../components/ui/Skeleton';
import { Download, Album, Artist } from '../../shared/types';
import { useToast } from '../components/ui/Toast';
import { getUserFriendlyErrorMessage } from '../utils/apiErrorHandler';

type StatusFilter = 'all' | 'queued' | 'downloading' | 'completed' | 'failed';

const ITEMS_PER_PAGE = 10;
const POLL_INTERVAL = 5000; // 5 seconds

export default function DownloadsPage() {
  const { showToast } = useToast();
  const [activeDownloads, setActiveDownloads] = useState<Download[]>([]);
  const [allDownloads, setAllDownloads] = useState<Download[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Cache for album and artist data
  const [albumCache, setAlbumCache] = useState<Map<string, Album>>(new Map());
  const [artistCache, setArtistCache] = useState<Map<string, Artist>>(new Map());

  // Fetch downloads
  const fetchDownloads = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setIsLoading(true);
    }

    try {
      // Fetch active downloads
      const activeResponse = await fetch('/api/downloads/active');
      if (activeResponse.ok) {
        const activeData = await activeResponse.json();
        setActiveDownloads(activeData.map((d: any) => ({
          ...d,
          initiatedAt: new Date(d.initiatedAt),
          completedAt: d.completedAt ? new Date(d.completedAt) : undefined,
        })));
      }

      // Fetch all downloads
      const allResponse = await fetch('/api/downloads');
      if (allResponse.ok) {
        const allData = await allResponse.json();
        setAllDownloads(allData.map((d: any) => ({
          ...d,
          initiatedAt: new Date(d.initiatedAt),
          completedAt: d.completedAt ? new Date(d.completedAt) : undefined,
        })));
      }
    } catch (error) {
      console.error('Error fetching downloads:', error);
      const message = getUserFriendlyErrorMessage(error, 'Failed to load downloads');
      showToast('error', message, {
        action: {
          label: 'Retry',
          onClick: () => fetchDownloads(),
        },
      });
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  }, [showToast]);

  // Fetch album and artist data for a download
  const fetchDownloadMetadata = useCallback(async (download: Download) => {
    try {
      // Fetch album if not in cache
      if (!albumCache.has(download.albumId)) {
        const albumResponse = await fetch(`/api/library/albums/${download.albumId}`);
        if (albumResponse.ok) {
          const album = await albumResponse.json();
          setAlbumCache(prev => new Map(prev).set(download.albumId, {
            ...album,
            createdAt: new Date(album.createdAt),
            updatedAt: new Date(album.updatedAt),
          }));

          // Fetch artist if not in cache
          if (!artistCache.has(album.artistId)) {
            const artistResponse = await fetch(`/api/library/artists/${album.artistId}`);
            if (artistResponse.ok) {
              const artist = await artistResponse.json();
              setArtistCache(prev => new Map(prev).set(album.artistId, {
                ...artist,
                createdAt: new Date(artist.createdAt),
                updatedAt: new Date(artist.updatedAt),
                lastChecked: artist.lastChecked ? new Date(artist.lastChecked) : undefined,
              }));
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching download metadata:', error);
    }
  }, [albumCache, artistCache]);

  // Update active download statuses
  const updateActiveDownloads = useCallback(async () => {
    if (activeDownloads.length === 0) return;

    try {
      const response = await fetch('/api/downloads/update-all', {
        method: 'POST',
      });

      if (response.ok) {
        // Refresh downloads after update
        await fetchDownloads(false);
      }
    } catch (error) {
      console.error('Error updating active downloads:', error);
    }
  }, [activeDownloads.length, fetchDownloads]);

  // Manual refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await updateActiveDownloads();
    await fetchDownloads(false);
    setIsRefreshing(false);
  };

  // Initial load
  useEffect(() => {
    fetchDownloads();
  }, [fetchDownloads]);

  // Fetch metadata for all downloads
  useEffect(() => {
    const allDownloadsToFetch = [...activeDownloads, ...allDownloads];
    allDownloadsToFetch.forEach(download => {
      fetchDownloadMetadata(download);
    });
  }, [activeDownloads, allDownloads, fetchDownloadMetadata]);

  // Set up polling for active downloads
  useEffect(() => {
    if (activeDownloads.length === 0) return;

    const interval = setInterval(() => {
      updateActiveDownloads();
    }, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [activeDownloads.length, updateActiveDownloads]);

  // Filter downloads based on status
  const filteredDownloads = statusFilter === 'all' 
    ? allDownloads 
    : allDownloads.filter(d => d.status === statusFilter);

  // Pagination
  const totalPages = Math.ceil(filteredDownloads.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedDownloads = filteredDownloads.slice(startIndex, endIndex);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);

  const getDownloadMetadata = (download: Download) => {
    const album = albumCache.get(download.albumId);
    const artist = album ? artistCache.get(album.artistId) : undefined;
    
    return {
      albumTitle: album?.title,
      artistName: artist?.name,
      artistId: artist?.id,
    };
  };

  if (isLoading) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-6">Downloads</h1>
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Active Downloads</h2>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <DownloadItemSkeleton key={i} />
              ))}
            </div>
          </div>
          <div>
            <h2 className="text-xl font-semibold mb-4">Download History</h2>
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <DownloadItemSkeleton key={i} />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Downloads</h1>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleRefresh}
          isLoading={isRefreshing}
          disabled={isRefreshing}
        >
          <RefreshCw className={clsx('h-4 w-4 mr-2', isRefreshing && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Status Filters */}
      <div className="mb-6 flex gap-2 flex-wrap">
        <button
          onClick={() => setStatusFilter('all')}
          className={clsx(
            'px-4 py-2 rounded-md transition-colors font-medium',
            statusFilter === 'all'
              ? 'bg-primary text-primary-foreground'
              : 'bg-card text-card-foreground border border-border hover:bg-secondary/50'
          )}
        >
          All ({allDownloads.length})
        </button>
        <button
          onClick={() => setStatusFilter('downloading')}
          className={clsx(
            'px-4 py-2 rounded-md transition-colors font-medium',
            statusFilter === 'downloading'
              ? 'bg-primary text-primary-foreground'
              : 'bg-card text-card-foreground border border-border hover:bg-secondary/50'
          )}
        >
          Downloading ({allDownloads.filter(d => d.status === 'downloading').length})
        </button>
        <button
          onClick={() => setStatusFilter('queued')}
          className={clsx(
            'px-4 py-2 rounded-md transition-colors font-medium',
            statusFilter === 'queued'
              ? 'bg-primary text-primary-foreground'
              : 'bg-card text-card-foreground border border-border hover:bg-secondary/50'
          )}
        >
          Queued ({allDownloads.filter(d => d.status === 'queued').length})
        </button>
        <button
          onClick={() => setStatusFilter('completed')}
          className={clsx(
            'px-4 py-2 rounded-md transition-colors font-medium',
            statusFilter === 'completed'
              ? 'bg-primary text-primary-foreground'
              : 'bg-card text-card-foreground border border-border hover:bg-secondary/50'
          )}
        >
          Completed ({allDownloads.filter(d => d.status === 'completed').length})
        </button>
        <button
          onClick={() => setStatusFilter('failed')}
          className={clsx(
            'px-4 py-2 rounded-md transition-colors font-medium',
            statusFilter === 'failed'
              ? 'bg-primary text-primary-foreground'
              : 'bg-card text-card-foreground border border-border hover:bg-secondary/50'
          )}
        >
          Failed ({allDownloads.filter(d => d.status === 'failed').length})
        </button>
      </div>

      <div className="space-y-8">
        {/* Active Downloads Section */}
        {activeDownloads.length > 0 && (
          <div>
            <h2 className="text-2xl font-semibold mb-4">
              Active Downloads ({activeDownloads.length})
            </h2>
            <div className="space-y-3">
              {activeDownloads.map(download => {
                const metadata = getDownloadMetadata(download);
                return (
                  <DownloadItem
                    key={download.id}
                    download={download}
                    {...metadata}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Download History Section */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">
            Download History
            {statusFilter !== 'all' && ` (${filteredDownloads.length})`}
          </h2>

          {paginatedDownloads.length === 0 ? (
            <div className="text-center py-12 bg-card border border-border rounded-lg">
              <p className="text-muted-foreground">
                {statusFilter === 'all' 
                  ? 'No download history yet'
                  : `No ${statusFilter} downloads`
                }
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {paginatedDownloads.map(download => {
                  const metadata = getDownloadMetadata(download);
                  return (
                    <DownloadItem
                      key={download.id}
                      download={download}
                      {...metadata}
                    />
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Showing {startIndex + 1}-{Math.min(endIndex, filteredDownloads.length)} of {filteredDownloads.length}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    
                    <span className="text-sm font-medium px-3">
                      Page {currentPage} of {totalPages}
                    </span>
                    
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
