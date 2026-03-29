/**
 * SkeletonLoader
 * Reusable shimmer-effect loading placeholders.
 * Use these instead of spinners for a more polished UX.
 */

// Base skeleton block with shimmer
const Skeleton = ({ className = '' }) => (
  <div className={`skeleton-shimmer rounded ${className}`} />
);

// File card skeleton
export const FileCardSkeleton = () => (
  <div className="glass-card p-4 animate-fade-in">
    <div className="flex items-start gap-3">
      <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" />
      <div className="flex-1">
        <Skeleton className="h-4 w-3/4 mb-2" />
        <div className="flex gap-3">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <div className="flex gap-1">
        <Skeleton className="w-8 h-8 rounded-lg" />
        <Skeleton className="w-8 h-8 rounded-lg" />
        <Skeleton className="w-8 h-8 rounded-lg" />
      </div>
    </div>
  </div>
);

// Folder list skeleton
export const FolderSkeleton = () => (
  <div className="space-y-1">
    {[1, 2, 3, 4].map((i) => (
      <div key={i} className="flex items-center gap-3 px-3 py-2.5">
        <Skeleton className="w-4 h-4 rounded" />
        <Skeleton className="h-4 flex-1" />
        <Skeleton className="w-6 h-4 rounded" />
      </div>
    ))}
  </div>
);

// Analytics card skeleton
export const AnalyticsSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
    {[1, 2, 3].map((i) => (
      <div key={i} className="glass-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Skeleton className="w-8 h-8 rounded-lg" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-8 w-2/3 mb-2" />
        <Skeleton className="h-3 w-1/3 mb-3" />
        <Skeleton className="h-2 w-full rounded-full" />
      </div>
    ))}
  </div>
);

// File list skeleton (multiple cards)
export const FileListSkeleton = ({ count = 5 }) => (
  <div className="grid gap-3">
    {Array.from({ length: count }).map((_, i) => (
      <FileCardSkeleton key={i} />
    ))}
  </div>
);

export default Skeleton;
