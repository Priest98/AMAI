export default function IntegrationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Social Integrations</h1>
        <p className="text-sm text-zinc-500 mt-1">Connect your brand's social media accounts to schedule and automate posts.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Instagram Card */}
        <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-6 flex flex-col justify-between shadow-sm">
          <div className="flex items-center space-x-4 mb-4">
            <div className="h-12 w-12 rounded-lg bg-pink-100 flex items-center justify-center text-pink-600 font-bold text-lg">
              IG
            </div>
            <div>
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Instagram</h3>
              <p className="text-xs text-zinc-500">Business & Creator Accounts</p>
            </div>
          </div>
          <a 
            href="http://localhost:3001/api/auth/instagram?brandId=example_brand_id"
            className="w-full py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-medium rounded-md hover:bg-zinc-800 dark:hover:bg-zinc-100 transition text-center block"
          >
            Connect Instagram
          </a>
        </div>

        {/* TikTok Card */}
        <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-6 flex flex-col justify-between shadow-sm">
          <div className="flex items-center space-x-4 mb-4">
            <div className="h-12 w-12 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-900 font-bold text-lg">
              TK
            </div>
            <div>
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">TikTok</h3>
              <p className="text-xs text-zinc-500">Creator & Business Accounts</p>
            </div>
          </div>
          <a 
            href="http://localhost:3001/api/auth/tiktok?brandId=example_brand_id"
            className="w-full py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-medium rounded-md hover:bg-zinc-800 dark:hover:bg-zinc-100 transition text-center block"
          >
            Connect TikTok
          </a>
        </div>
      </div>
    </div>
  );
}
