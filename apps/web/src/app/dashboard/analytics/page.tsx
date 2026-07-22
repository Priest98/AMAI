export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Publishing Logs</h1>
        <p className="text-sm text-zinc-500 mt-1">Monitor the status of your automated posts and background jobs.</p>
      </div>

      <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-zinc-500 bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-700 uppercase">
              <tr>
                <th scope="col" className="px-6 py-4 font-medium">Date & Time</th>
                <th scope="col" className="px-6 py-4 font-medium">Platform</th>
                <th scope="col" className="px-6 py-4 font-medium">Status</th>
                <th scope="col" className="px-6 py-4 font-medium">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700 text-zinc-700 dark:text-zinc-300">
              
              {/* Example Success Row */}
              <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition">
                <td className="px-6 py-4 whitespace-nowrap text-zinc-900 dark:text-zinc-100 font-medium">
                  Jul 24, 2026 10:00 AM
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-pink-100 text-pink-700">
                    Instagram
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center space-x-1 text-green-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium text-xs uppercase tracking-wider">Published</span>
                  </span>
                </td>
                <td className="px-6 py-4 text-xs text-zinc-500 truncate max-w-xs">
                  {`{"success":true,"platformId":"ig_123456789"}`}
                </td>
              </tr>

              {/* Example Failed Row */}
              <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition">
                <td className="px-6 py-4 whitespace-nowrap text-zinc-900 dark:text-zinc-100 font-medium">
                  Jul 24, 2026 10:00 AM
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-blue-100 text-blue-700">
                    LinkedIn
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center space-x-1 text-red-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium text-xs uppercase tracking-wider">Failed</span>
                  </span>
                </td>
                <td className="px-6 py-4 text-xs text-red-500 font-medium truncate max-w-xs">
                  Error: OAuth Token Expired. Please reconnect account.
                </td>
              </tr>

            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
