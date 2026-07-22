export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-zinc-800 p-6 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm">
          <h3 className="text-sm font-medium text-zinc-500">Total Posts Scheduled</h3>
          <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mt-2">124</p>
        </div>
        <div className="bg-white dark:bg-zinc-800 p-6 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm">
          <h3 className="text-sm font-medium text-zinc-500">Active Brands</h3>
          <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mt-2">3</p>
        </div>
        <div className="bg-white dark:bg-zinc-800 p-6 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm">
          <h3 className="text-sm font-medium text-zinc-500">Pending Approvals</h3>
          <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mt-2">12</p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-700">
          <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">Recent Activity</h2>
        </div>
        <div className="p-6">
          <p className="text-zinc-500 dark:text-zinc-400">No recent activity found. Connect a social account to begin tracking.</p>
        </div>
      </div>
    </div>
  );
}
