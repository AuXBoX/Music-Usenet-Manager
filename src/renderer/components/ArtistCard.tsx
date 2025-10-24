import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Music, Eye, EyeOff } from 'lucide-react';
import { clsx } from 'clsx';
import { Artist } from '../../shared/types';

interface ArtistCardProps {
  artist: Artist;
}

export default function ArtistCard({ artist }: ArtistCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/artists/${artist.id}`);
  };

  return (
    <div
      onClick={handleClick}
      className={clsx(
        'bg-card border border-border rounded-lg p-4 cursor-pointer',
        'card-hover group',
        'flex flex-col gap-3'
      )}
    >
      {/* Artist Icon/Avatar */}
      <div className="flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mx-auto transition-all duration-300 group-hover:bg-primary/20 group-hover:scale-110">
        <Music className="h-8 w-8 text-primary transition-transform duration-300 group-hover:scale-110" />
      </div>

      {/* Artist Name */}
      <div className="text-center">
        <h3 className="font-semibold text-lg truncate transition-colors duration-200 group-hover:text-primary" title={artist.name}>
          {artist.name}
        </h3>
      </div>

      {/* Album Count and Monitoring Status */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {artist.albumCount} {artist.albumCount === 1 ? 'album' : 'albums'}
        </span>
        
        {/* Monitoring Indicator */}
        <div className="flex items-center gap-1">
          {artist.monitored ? (
            <>
              <Eye className="h-4 w-4 text-green-500" />
              <span className="text-green-500 text-xs">Monitored</span>
            </>
          ) : (
            <>
              <EyeOff className="h-4 w-4" />
              <span className="text-xs">Not monitored</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
