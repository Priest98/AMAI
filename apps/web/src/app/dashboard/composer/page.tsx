export default function ComposerPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Post Composer</h1>
        <p className="text-sm text-zinc-500 mt-1">Draft, schedule, and publish content across your channels.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Editor Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm overflow-hidden p-6">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Select Platforms
            </label>
            <div className="flex space-x-3 mb-6">
              <button className="flex items-center space-x-2 px-3 py-1.5 rounded-full border-2 border-pink-500 bg-pink-50 dark:bg-pink-900/20 text-pink-700 dark:text-pink-300 transition">
                <span className="font-semibold">IG</span>
                <span className="text-sm font-medium">Instagram</span>
              </button>
              <button className="flex items-center space-x-2 px-3 py-1.5 rounded-full border border-zinc-300 dark:border-zinc-600 hover:border-blue-500 text-zinc-600 dark:text-zinc-400 transition">
                <span className="font-semibold">FB</span>
                <span className="text-sm font-medium">Facebook</span>
              </button>
              <button className="flex items-center space-x-2 px-3 py-1.5 rounded-full border border-zinc-300 dark:border-zinc-600 hover:border-blue-700 text-zinc-600 dark:text-zinc-400 transition">
                <span className="font-semibold">IN</span>
                <span className="text-sm font-medium">LinkedIn</span>
              </button>
            </div>

            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Caption
            </label>
            <div className="relative">
              <textarea
                className="w-full h-40 p-4 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-transparent text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none mb-4 resize-none"
                placeholder="What do you want to share?"
              ></textarea>
              <button 
                className="absolute bottom-6 right-3 flex items-center space-x-1 px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-medium rounded hover:bg-blue-100 dark:hover:bg-blue-900/50 transition"
              >
                <span>✨</span>
                <span>AI Spark</span>
              </button>
            </div>

            <div className="flex justify-between items-center border-t border-zinc-200 dark:border-zinc-700 pt-4">
              <button className="flex items-center space-x-2 text-sm font-medium text-blue-600 hover:text-blue-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Add Media</span>
              </button>
              <span className="text-xs text-zinc-400">0/2200 characters</span>
            </div>
          </div>
        </div>

        {/* Scheduling & Preview Section */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm p-6">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Scheduling</h3>
            <div className="space-y-4">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input type="radio" name="schedule_type" className="form-radio text-blue-600" defaultChecked />
                <span className="text-sm text-zinc-700 dark:text-zinc-300">Publish Now</span>
              </label>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input type="radio" name="schedule_type" className="form-radio text-blue-600" />
                <span className="text-sm text-zinc-700 dark:text-zinc-300">Schedule for later</span>
              </label>
              
              <div className="pt-2">
                <input 
                  type="datetime-local" 
                  className="w-full p-2 text-sm border border-zinc-300 dark:border-zinc-600 rounded-md bg-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none opacity-50 cursor-not-allowed" 
                  disabled
                />
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-700">
              <button className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-md shadow-sm transition">
                Publish Post
              </button>
              <button className="w-full mt-3 py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium text-sm rounded-md transition">
                Save as Draft
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
