import { Skeleton, SkeletonListRows } from '@/components/ui/Skeleton';

/** Stable route fallback rendered inside the persistent authenticated shell. */
export default function DashboardRouteLoading() {
  return (
    <section className="max-w-5xl mx-auto space-y-6 pb-24 sm:pb-12" aria-busy="true" aria-label="Loading workspace">
      <div className="space-y-2">
        <Skeleton className="h-9 w-52" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28 w-full" />)}
      </div>
      <div className="exec-card p-5">
        <SkeletonListRows count={4} />
      </div>
    </section>
  );
}
