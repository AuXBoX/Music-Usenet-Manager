import React, { useState } from 'react';
import { Download, Check, Loader2, Music } from 'lucide-react';
import { clsx } from 'clsx';
import { Album } from '../../shared/types';
import Button from './ui/Button';
import Badge from './ui/Badge';
import LazyImage from './ui/LazyImage';

interface AlbumCardProps {
  album: Album;
  onDownload?: (albumId: string) => void;
  isDownloading?: boolean;
}

export default function AlbumCard({ album, onDownload, isDownloading = false }: AlbumCardProps) {
  const [imageError] = useState(false);

  const handleDownloadClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDownload && !album.isOwned && !isDownloading) {
      onDownload(album.id);
    }
  };

  return (
    <div
      className={clsx(
        'bg-card border border-border rounded-lg overflow-hidden',
        'card-hover group',
        'flex flex-col'
      )}
    >
      {/* Album Artwork */}
      <div className="relative aspect-square bg-muted overflow-hidden">
        {album.artworkUrl && !imageError ? (
          <LazyImage
            src={album.artworkUrl}
            alt={`${album.title} artwork`}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            fallback={
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <Music className="h-16 w-16 text-muted-foreground/30" />
              </div>
            }
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music className="h-16 w-16 text-muted-foreground/30 transition-transform duration-300 group-hover:scale-110" />
          </div>
        )}

        {/* Status Badge */}
        <div className="absolute top-2 right-2">
          {album.isOwned ? (
            <Badge variant="success" size="sm" className="shadow-lg">
              <Check className="h-3 w-3 mr-1" />
              Owned
            </Badge>
          ) : isDownloading ? (
            <Badge variant="info" size="sm" className="shadow-lg">
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              Downloading
            </Badge>
          ) : null}
        </div>
      </div>

      {/* Album Info */}
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="font-semibold text-base line-clamp-2 mb-1" title={album.title}>
          {album.title}
        </h3>

        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
          {album.releaseYear && <span>{album.releaseYear}</span>}
          {album.trackCount && (
            <>
              {album.releaseYear && <span>•</span>}
              <span>{album.trackCount} tracks</span>
            </>
          )}
        </div>

        {/* Download Button for Missing Albums */}
        {!album.isOwned && (
          <div className="mt-auto">
            <Button
              variant="primary"
              size="sm"
              className="w-full"
              onClick={handleDownloadClick}
              isLoading={isDownloading}
              disabled={isDownloading}
            >
              {isDownloading ? (
                'Downloading...'
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </>
              )}
            </Button>
          </div>
        )}

        {/* Owned Status */}
        {album.isOwned && (
          <div className="mt-auto">
            <div className="flex items-center justify-center gap-2 text-sm text-green-600 font-medium">
              <Check className="h-4 w-4" />
              <span>In Library</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
