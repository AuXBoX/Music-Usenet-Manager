import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Music, 
  Download as DownloadIcon, 
  Users, 
  Settings, 
  FolderSearch,
  ArrowRight,
  CheckCircle,
  XCircle,
  Clock,
  Loader2
} from 'lucide-react';
import { clsx } from 'clsx';
import Badge from '../components/ui/Badge';
import { Artist, Download } from '../../shared/types';
import { useToast } from '../components/ui/Toast';
import { getUserFriendlyErrorMessage } from '../utils/apiErrorHandler';

export default function DashboardPage() {
  const { showToast } = useToast();
  const [recentDownloads, setRecentDownloads] = useState<Download[]>([]);
  const [activeDownloads, setActiveDownloads] = useState<Download[]>([]);
  const [monitoredArtists, setMonitoredArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    
    // Poll for active download updates every 5 seconds
    const interval = setInterval(() => {
      fetchActiveDownloads();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchRecentDownloads(),
        fetchActiveDownloads(),
        fetchMonitoredArtists(),
      ]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      const message = getUserFriendlyErrorMessage(error, 'Failed to load dashboard data');
      showToast('error', message);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentDownloads = async () => {
    try {
      const response = await fetch('/api/downloads');
      if (response.ok) {
        const downloads = await response.json();
        // Get the 5 most recent downloads
        const recent = downloads
          .sort((a: Download, b: Download) => 
            new Date(b.initiatedAt).getTime() - new Date(a.initiatedAt).getTime()
          )
          .slice(0, 5);
        setRecentDownloads(recent);
      }
    } catch (error) {
      console.error('Error fetching recent downloads:', error);
      // Silent fail for widget data
    }
  };

  const fetchActiveDownloads = async () => {
    try {
      const response = await fetch('/api/downloads/active');
      if (response.ok) {
        const downloads = await response.json();
        setActiveDownloads(downloads);
      }
    } catch (error) {
      console.error('Error fetching active downloads:', error);
    }
  };

  const fetchMonitoredArtists = async () => {
    try {
      const response = await fetch('/api/library/artists?monitored=true');
      if (response.ok) {
        const artists = await response.json();
        setMonitoredArtists(artists);
      }
    } catch (error) {
      console.error('Error fetching monitored artists:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'downloading':
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />;
      case 'queued':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return null;
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
    }).format(new Date(date));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        
        {/* Quick Action Buttons */}
        <div className="flex gap-3">
          <Link
            to="/library"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <FolderSearch className="h-4 w-4" />
            Scan Library
          </Link>
          <Link
            to="/settings"
            className="inline-flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
          >
            <Settings className="h-4 w-4" />
            Settings
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Stats Cards */}
        <div className="bg-card border border-border rounded-lg p-6 transition-smooth hover:border-primary/50 hover:shadow-md">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-lg transition-all duration-300 group-hover:scale-110">
              <Music className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Monitored Artists</p>
              <p className="text-2xl font-bold">{monitoredArtists.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 transition-smooth hover:border-primary/50 hover:shadow-md">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-500/10 rounded-lg transition-all duration-300 group-hover:scale-110">
              <DownloadIcon className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active Downloads</p>
              <p className="text-2xl font-bold">{activeDownloads.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 transition-smooth hover:border-primary/50 hover:shadow-md">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-500/10 rounded-lg transition-all duration-300 group-hover:scale-110">
              <Users className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Downloads</p>
              <p className="text-2xl font-bold">{recentDownloads.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity Widget */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Recent Activity</h2>
            <Link
              to="/downloads"
              className="text-sm text-primary hover:underline inline-flex items-center gap-1"
            >
              View All
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {recentDownloads.length === 0 ? (
            <div className="text-center py-8">
              <DownloadIcon className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground">No recent downloads</p>
              <p className="text-sm text-muted-foreground mt-1">
                Downloads will appear here once you start downloading albums
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentDownloads.map((download) => (
                <div
                  key={download.id}
                  className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="flex-shrink-0">
                    {getStatusIcon(download.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      Album ID: {download.albumId}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(download.initiatedAt)}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <Badge 
                      variant={
                        download.status === 'completed' ? 'success' :
                        download.status === 'failed' ? 'error' :
                        download.status === 'downloading' ? 'info' :
                        'warning'
                      }
                      size="sm"
                    >
                      {download.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Download Queue Widget */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Download Queue</h2>
            <Link
              to="/downloads"
              className="text-sm text-primary hover:underline inline-flex items-center gap-1"
            >
              View All
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {activeDownloads.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground">No active downloads</p>
              <p className="text-sm text-muted-foreground mt-1">
                Your download queue is empty
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeDownloads.map((download) => (
                <div
                  key={download.id}
                  className="p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex-shrink-0">
                      {getStatusIcon(download.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        Album ID: {download.albumId}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {download.indexerName || 'Unknown indexer'}
                      </p>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span>{download.status === 'downloading' ? 'Downloading' : 'Queued'}</span>
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
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Monitored Artists Widget */}
        <div className="bg-card border border-border rounded-lg p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Monitored Artists</h2>
            <Link
              to="/library?monitored=true"
              className="text-sm text-primary hover:underline inline-flex items-center gap-1"
            >
              View All
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {monitoredArtists.length === 0 ? (
            <div className="text-center py-8">
              <Music className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground">No monitored artists</p>
              <p className="text-sm text-muted-foreground mt-1">
                Enable monitoring for artists to automatically download new releases
              </p>
              <Link
                to="/library"
                className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                Browse Library
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {monitoredArtists.slice(0, 6).map((artist) => (
                <Link
                  key={artist.id}
                  to={`/artists/${artist.id}`}
                  className="p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate group-hover:text-primary transition-colors">
                        {artist.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {artist.albumCount} {artist.albumCount === 1 ? 'album' : 'albums'}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 ml-2" />
                  </div>
                </Link>
              ))}
            </div>
          )}

          {monitoredArtists.length > 6 && (
            <div className="mt-4 text-center">
              <Link
                to="/library?monitored=true"
                className="text-sm text-primary hover:underline"
              >
                View {monitoredArtists.length - 6} more monitored artists
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
