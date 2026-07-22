export default function MediaLibraryPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Media Library</h1>
          <p className="text-sm text-zinc-500 mt-1">Manage and organize your brand's images and videos.</p>
        </div>
        <div className="flex space-x-3">
          <button className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 font-medium text-sm rounded-md transition">
            + New Folder
          </button>
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-md shadow-sm transition">
            Upload Media
          </button>
        </div>
      </div>

      {/* Grid Container */}
      <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm overflow-hidden p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex space-x-2 text-sm text-zinc-500">
            <span className="cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-100">Home</span>
            <span>/</span>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">Campaigns 2026</span>
          </div>
          
          <div className="relative">
            <input 
              type="text" 
              placeholder="Search media..." 
              className="pl-9 pr-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-transparent text-sm w-64 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <div className="absolute left-3 top-2.5 text-zinc-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {/* Example Uploaded Image Card */}
          <div className="group relative aspect-square rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900 overflow-hidden cursor-pointer">
            <div className="absolute inset-0 flex items-center justify-center text-zinc-400">
              [Image Placeholder]
            </div>
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition duration-200" />
            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition duration-200">
              <p className="text-xs text-white truncate">summer-sale-banner.png</p>
            </div>
          </div>

           {/* Example Folder Card */}
           <div className="group relative aspect-square rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 flex flex-col items-center justify-center cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-700 transition">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-blue-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Logos</p>
          </div>
        </div>
      </div>
    </div>
  );
}
