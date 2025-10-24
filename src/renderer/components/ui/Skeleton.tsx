import React from 'react';
import { clsx } from 'clsx';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
}

export default function Skeleton({ className, variant = 'rectangular' }: SkeletonProps) {
  const baseStyles = 'animate-pulse bg-muted';
  
  const variants = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-md',
  };

  return (
    <div className={clsx(baseStyles, variants[variant], className)} />
  );
}

// Preset skeleton components for common use cases
export function ArtistCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex flex-col gap-3">
        <Skeleton variant="circular" className="w-16 h-16 mx-auto" />
        <Skeleton variant="text" className="h-6 w-3/4 mx-auto" />
        <div className="flex items-center justify-between">
          <Skeleton variant="text" className="h-4 w-16" />
          <Skeleton variant="text" className="h-4 w-20" />
        </div>
      </div>
    </div>
  );
}

export function AlbumCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <Skeleton className="w-full aspect-square" />
      <div className="p-4 space-y-2">
        <Skeleton variant="text" className="h-5 w-3/4" />
        <Skeleton variant="text" className="h-4 w-1/2" />
        <Skeleton variant="text" className="h-4 w-full" />
      </div>
    </div>
  );
}

export function DownloadItemSkeleton() {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center gap-4">
        <Skeleton variant="circular" className="w-12 h-12" />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" className="h-5 w-1/3" />
          <Skeleton variant="text" className="h-4 w-1/2" />
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
        <Skeleton variant="text" className="h-6 w-20" />
      </div>
    </div>
  );
}
