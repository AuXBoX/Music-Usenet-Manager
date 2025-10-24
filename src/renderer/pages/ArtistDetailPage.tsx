import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Loader2 } from 'lucide-react';
import AlbumCard from '../components/AlbumCard';
import Button from '../components/ui/Button';
import { AlbumCardSkeleton } from '../components/ui/Skeleton';
import { useToast } from '../components/ui/Toast';
import { Artist, Album, AlbumMetadata } from '../../shared/types';
import { getUserFriendlyErrorMessage } from '../utils/apiErrorHandler';

export default function ArtistDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [artist, setArtist] = useState<Artist | null>(null);
  const [ownedAlbums, setOwnedAlbums] = useState<Album[]>([]);
  const [missingAlbums, setMissingAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDiscography, setLoadingDiscography] = useState(false);
  const [updatingMonitoring, setUpdatingMonitoring] = useState(false);
  const [downloadingAlbums, setDownloadingAlbums] = useState<Set<string>>(new Set());

  // Fetch artist details and albums
  useEffect(() => {
    if (!id) return;

    const fetchArtistData = async () => {
      try {
        setLoading(true);

        // Fetch artist details
        const artistResponse = await fetch(`/api/library/artists/${id}`);
        if (!artistResponse.ok) {
          throw new Error('Failed to fetch artist details');
        }
        const artistData: Artist = await artistResponse.json();
        setArtist(artistData);

        // Fetch owned albums
        const albumsResponse = await fetch(`/api/library/artists/${id}/albums`);
        if (!albumsResponse.ok) {
          throw new Error('Failed to fetch albums');
        }
        const albumsData: Album[] = await albumsResponse.json();
        
        // Separate owned albums
        const owned = albumsData.filter(album => album.isOwned);
        setOwnedAlbums(owned);

        // Fetch complete discography from metadata service
        setLoadingDiscography(true);
        try {
          const discographyResponse = await fetch(
            `/api/metadata/artist/${encodeURIComponent(artistData.name)}/discography`
          );
          
          if (discographyResponse.ok) {
            const discography = await discographyResponse.json();
            
            // Create a map of owned album titles (normalized)
            const ownedTitles = new Set(
              owned.map(album => album.title.toLowerCase().trim())
            );

            // Find missing albums by comparing discography with owned albums
            const missing: Album[] = discography.albums
              .filter((metaAlbum: AlbumMetadata) => {
                const normalizedTitle = metaAlbum.title.toLowerCase().trim();
                return !ownedTitles.has(normalizedTitle);
              })
              .map((metaAlbum: AlbumMetadata) => ({
                id: metaAlbum.id,
                artistId: id,
                title: metaAlbum.title,
                releaseYear: metaAlbum.releaseYear,
                trackCount: metaAlbum.trackCount,
                artworkUrl: metaAlbum.artworkUrl,
                isOwned: false,
                createdAt: new Date(),
                updatedAt: new Date(),
              }));

            setMissingAlbums(missing);
          }
        } catch (error) {
          console.error('Error fetching discography:', error);
          const message = getUserFriendlyErrorMessage(error, 'Failed to load complete discography');
          showToast('error', message);
        } finally {
          setLoadingDiscography(false);
        }
      } catch (error) {
        console.error('Error fetching artist data:', error);
        const message = getUserFriendlyErrorMessage(error, 'Failed to load artist details');
        showToast('error', message, {
          action: {
            label: 'Retry',
            onClick: () => window.location.reload(),
          },
        });
      } finally {
        setLoading(false);
      }
    };

    fetchArtistData();
  }, [id]);

  // Toggle artist monitoring
  const handleToggleMonitoring = async () => {
    if (!artist || !id) return;

    try {
      setUpdatingMonitoring(true);
      const newMonitoredState = !artist.monitored;

      const response = await fetch(`/api/library/artists/${id}/monitor`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ monitored: newMonitoredState }),
      });

      if (!response.ok) {
        throw new Error('Failed to update monitoring status');
      }

      const updatedArtist: Artist = await response.json();
      setArtist(updatedArtist);
      
      showToast(
        'success',
        newMonitoredState
          ? `Now monitoring ${artist.name} for new releases`
          : `Stopped monitoring ${artist.name}`
      );
    } catch (error) {
      console.error('Error updating monitoring:', error);
      const message = getUserFriendlyErrorMessage(error, 'Failed to update monitoring status');
      showToast('error', message, {
        action: {
          label: 'Retry',
          onClick: handleToggleMonitoring,
        },
      });
    } finally {
      setUpdatingMonitoring(false);
    }
  };

  // Handle album download
  const handleDownloadAlbum = async (albumId: string) => {
    if (!artist) return;

    // Find the album to get its title
    const album = missingAlbums.find(a => a.id === albumId);
    if (!album) return;

    try {
      // Add to downloading set to show loading spinner
      setDownloadingAlbums(prev => new Set(prev).add(albumId));

      // Initiate download through orchestrated endpoint
      const downloadResponse = await fetch('/api/download/album', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          albumId,
        }),
      });

      if (!downloadResponse.ok) {
        const errorData = await downloadResponse.json();
        
        // Handle specific error cases
        if (errorData.error?.code === 'NO_RESULTS') {
          showToast('error', `No results found for "${album.title}"`);
        } else if (errorData.error?.code === 'SERVICE_UNAVAILABLE') {
          showToast('error', errorData.error.message || 'Service unavailable');
        } else {
          showToast('error', errorData.error?.message || 'Failed to start download');
        }
        return;
      }

      const result = await downloadResponse.json();
      showToast('success', `Download started for "${album.title}"`);

      // Start polling for download status
      if (result.download?.id) {
        pollDownloadStatus(result.download.id, albumId);
      }
    } catch (error) {
      console.error('Error downloading album:', error);
      const message = getUserFriendlyErrorMessage(error, 'Failed to start download');
      showToast('error', message, {
        action: {
          label: 'Retry',
          onClick: () => handleDownloadAlbum(albumId),
        },
      });
      
      // Remove from downloading set on error
      setDownloadingAlbums(prev => {
        const newSet = new Set(prev);
        newSet.delete(albumId);
        return newSet;
      });
    }
  };

  // Poll download status and update UI
  const pollDownloadStatus = async (downloadId: string, albumId: string) => {
    let pollCount = 0;
    const maxPolls = 60; // Poll for up to 5 minutes (60 * 5 seconds)
    
    const poll = async () => {
      try {
        const response = await fetch(`/api/downloads/${downloadId}/status`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch download status');
        }

        const status = await response.json();

        // Update UI based on status
        if (status.status === 'completed') {
          showToast('success', 'Download completed successfully');
          setDownloadingAlbums(prev => {
            const newSet = new Set(prev);
            newSet.delete(albumId);
            return newSet;
          });
          return; // Stop polling
        } else if (status.status === 'failed') {
          showToast('error', status.errorMessage || 'Download failed');
          setDownloadingAlbums(prev => {
            const newSet = new Set(prev);
            newSet.delete(albumId);
            return newSet;
          });
          return; // Stop polling
        }

        // Continue polling if still downloading or queued
        pollCount++;
        if (pollCount < maxPolls && (status.status === 'downloading' || status.status === 'queued')) {
          setTimeout(poll, 5000); // Poll every 5 seconds
        } else if (pollCount >= maxPolls) {
          // Stop showing loading state after max polls, but download continues
          setDownloadingAlbums(prev => {
            const newSet = new Set(prev);
            newSet.delete(albumId);
            return newSet;
          });
        }
      } catch (error) {
        console.error('Error polling download status:', error);
        // Stop polling on error but don't show error toast (download may still be in progress)
        setDownloadingAlbums(prev => {
          const newSet = new Set(prev);
          newSet.delete(albumId);
          return newSet;
        });
      }
    };

    // Start polling after a short delay
    setTimeout(poll, 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground text-lg">Artist not found</p>
        <Button onClick={() => navigate('/library')} className="mt-4">
          Back to Library
        </Button>
      </div>
    );
  }

  return (
    <div>
      {/* Back Button */}
      <button
        onClick={() => navigate('/library')}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Library</span>
      </button>

      {/* Artist Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">{artist.name}</h1>
            <p className="text-muted-foreground">
              {ownedAlbums.length} of {ownedAlbums.length + missingAlbums.length} albums
            </p>
          </div>

          {/* Monitoring Toggle */}
          <Button
            variant={artist.monitored ? 'secondary' : 'primary'}
            onClick={handleToggleMonitoring}
            isLoading={updatingMonitoring}
            disabled={updatingMonitoring}
          >
            {artist.monitored ? (
              <>
                <Eye className="h-4 w-4 mr-2" />
                Monitoring
              </>
            ) : (
              <>
                <EyeOff className="h-4 w-4 mr-2" />
                Monitor Artist
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Albums Sections */}
      <div className="space-y-8">
        {/* Owned Albums Section */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">
            Owned Albums ({ownedAlbums.length})
          </h2>
          
          {ownedAlbums.length === 0 ? (
            <div className="text-center py-8 bg-card border border-border rounded-lg">
              <p className="text-muted-foreground">No albums in your library yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {ownedAlbums.map((album) => (
                <AlbumCard key={album.id} album={album} />
              ))}
            </div>
          )}
        </div>

        {/* Missing Albums Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold">
              Missing Albums ({missingAlbums.length})
            </h2>
            {loadingDiscography && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading discography...</span>
              </div>
            )}
          </div>

          {loadingDiscography ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <AlbumCardSkeleton key={i} />
              ))}
            </div>
          ) : missingAlbums.length === 0 ? (
            <div className="text-center py-8 bg-card border border-border rounded-lg">
              <p className="text-muted-foreground">
                {ownedAlbums.length > 0
                  ? 'You have all available albums!'
                  : 'No albums found in discography'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {missingAlbums.map((album) => (
                <AlbumCard
                  key={album.id}
                  album={album}
                  onDownload={handleDownloadAlbum}
                  isDownloading={downloadingAlbums.has(album.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
