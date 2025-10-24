import { useState, useEffect } from 'react';
import { Search, SlidersHorizontal, Grid3x3, List } from 'lucide-react';
import ArtistCard from '../components/ArtistCard';
import ScanLibraryModal from '../components/ScanLibraryModal';
import Button from '../components/ui/Button';
import { ArtistCardSkeleton } from '../components/ui/Skeleton';
import { Artist } from '../../shared/types';
import { useToast } from '../components/ui/Toast';
import { getUserFriendlyErrorMessage } from '../utils/apiErrorHandler';

type ViewMode = 'grid' | 'list';
type SortOption = 'name' | 'albumCount';
type SortOrder = 'asc' | 'desc';

export default function LibraryPage() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [filterMonitored, setFilterMonitored] = useState<boolean | undefined>(undefined);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showScanModal, setShowScanModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const { showToast } = useToast();

  // Fetch artists from API
  const fetchArtists = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (searchQuery) params.append('search', searchQuery);
      if (filterMonitored !== undefined) params.append('monitored', String(filterMonitored));
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);

      const response = await fetch(`/api/library/artists?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch artists');
      }

      const data: Artist[] = await response.json();
      setArtists(data);
    } catch (error) {
      console.error('Error fetching artists:', error);
      const message = getUserFriendlyErrorMessage(error, 'Failed to load artists');
      showToast('error', message, {
        action: {
          label: 'Retry',
          onClick: fetchArtists,
        },
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArtists();
  }, [sortBy, sortOrder, filterMonitored]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchArtists();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleStartScan = async () => {
    try {
      // First, get the library path from config
      const configResponse = await fetch('/api/config/library-path');
      if (!configResponse.ok) {
        showToast('error', 'Library path not configured. Please set it in Settings.');
        setShowScanModal(false);
        return;
      }

      const { path } = await configResponse.json();
      
      if (!path) {
        showToast('error', 'Library path not configured. Please set it in Settings.');
        setShowScanModal(false);
        return;
      }

      // Start the scan with the configured path
      const response = await fetch('/api/library/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path }),
      });

      if (!response.ok) {
        throw new Error('Failed to start library scan');
      }

      showToast('success', 'Library scan started');
    } catch (error) {
      console.error('Error starting scan:', error);
      showToast('error', 'Failed to start library scan');
      setShowScanModal(false);
    }
  };

  const handleScanModalClose = () => {
    setShowScanModal(false);
    // Refresh artists after scan
    fetchArtists();
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Library</h1>
          <p className="text-muted-foreground mt-1">
            {artists.length} {artists.length === 1 ? 'artist' : 'artists'}
          </p>
        </div>
        <Button onClick={() => setShowScanModal(true)}>
          Scan Library
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search artists..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* View Mode Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'grid'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-input hover:bg-accent'
              }`}
              title="Grid view"
            >
              <Grid3x3 className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'list'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-input hover:bg-accent'
              }`}
              title="List view"
            >
              <List className="h-5 w-5" />
            </button>
          </div>

          {/* Filters Toggle */}
          <Button
            variant="secondary"
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="bg-card border border-border rounded-lg p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Sort By */}
              <div>
                <label className="block text-sm font-medium mb-2">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="w-full px-3 py-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="name">Name</option>
                  <option value="albumCount">Album Count</option>
                </select>
              </div>

              {/* Sort Order */}
              <div>
                <label className="block text-sm font-medium mb-2">Order</label>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                  className="w-full px-3 py-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="asc">Ascending</option>
                  <option value="desc">Descending</option>
                </select>
              </div>

              {/* Filter by Monitoring */}
              <div>
                <label className="block text-sm font-medium mb-2">Monitoring Status</label>
                <select
                  value={filterMonitored === undefined ? 'all' : String(filterMonitored)}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFilterMonitored(value === 'all' ? undefined : value === 'true');
                  }}
                  className="w-full px-3 py-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="all">All</option>
                  <option value="true">Monitored</option>
                  <option value="false">Not Monitored</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Artists Grid/List */}
      {loading ? (
        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4'
              : 'space-y-2'
          }
        >
          {Array.from({ length: 12 }).map((_, i) => (
            <ArtistCardSkeleton key={i} />
          ))}
        </div>
      ) : artists.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-lg">
            {searchQuery
              ? 'No artists found matching your search.'
              : 'No artists found. Scan your library to get started.'}
          </p>
        </div>
      ) : (
        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4'
              : 'space-y-2'
          }
        >
          {artists.map((artist) => (
            <ArtistCard key={artist.id} artist={artist} />
          ))}
        </div>
      )}

      {/* Scan Library Modal */}
      <ScanLibraryModal
        isOpen={showScanModal}
        onClose={handleScanModalClose}
        onStartScan={handleStartScan}
      />
    </div>
  );
}
