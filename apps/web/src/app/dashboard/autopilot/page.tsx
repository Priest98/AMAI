export default function AutoPilotPage() {
  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Google Drive Auto-Pilot</h1>
        <p className="text-sm text-zinc-500 mt-1">Automatically sync, generate captions with AI, and publish directly from Google Drive.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Col: Setup */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
            <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-4">1. Connect Source</h3>
            
            <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700 mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                     <path d="M12.01 2.375L4.24 15.826h15.54L12.01 2.375zM4.62 17.065L.85 23.615h15.34l-3.77-6.55H4.62zm16.14.28L16.5 10.325l-3.77 6.55 3.77 6.55 4.26-6.08z"/>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Google Drive</p>
                  <p className="text-xs text-zinc-500">Not connected</p>
                </div>
              </div>
              <button className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition shadow-sm">
                Connect
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Drive Folder ID</label>
              <input 
                type="text" 
                placeholder="e.g. 1A2b3C4d5E6f7G8h9I0j" 
                disabled
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-zinc-50 dark:bg-zinc-800/50 text-sm text-zinc-500 cursor-not-allowed"
              />
              <p className="text-xs text-zinc-500 mt-1">Connect your account first to select a folder.</p>
            </div>
            
            <div className="mt-6 border-t border-zinc-200 dark:border-zinc-700 pt-6">
              <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700 mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-black dark:bg-white rounded-full flex items-center justify-center shadow-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white dark:text-black" viewBox="0 0 384 512" fill="currentColor">
                      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Apple iCloud (iOS Shortcut)</p>
                    <p className="text-xs text-zinc-500">Not configured</p>
                  </div>
                </div>
                <button className="px-3 py-1.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium rounded-md hover:bg-zinc-800 dark:hover:bg-zinc-200 transition shadow-sm">
                  Setup
                </button>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Your Unique Webhook URL</label>
                <div className="flex">
                  <input 
                    type="text" 
                    value="Click Setup to generate your iOS Webhook URL" 
                    readOnly
                    className="w-full px-3 py-2 border border-r-0 border-zinc-300 dark:border-zinc-700 rounded-l-md bg-zinc-50 dark:bg-zinc-800/50 text-sm text-zinc-500"
                  />
                  <button className="px-3 py-2 bg-zinc-200 dark:bg-zinc-700 border border-l-0 border-zinc-300 dark:border-zinc-700 rounded-r-md text-zinc-600 dark:text-zinc-300 text-sm hover:bg-zinc-300 dark:hover:bg-zinc-600">
                    Copy
                  </button>
                </div>
                <p className="text-xs text-zinc-500 mt-2">
                  1. Download our <a href="#" className="text-blue-500 hover:underline">Official iOS Shortcut</a>.<br/>
                  2. Paste this Webhook URL into the Shortcut settings.<br/>
                  3. Set an iOS Personal Automation to run the Shortcut whenever a photo is added to your 'Marketing' album.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
            <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-4">2. AI Settings</h3>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Default Tone</label>
                <select className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-transparent text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
                  <option value="professional">Professional</option>
                  <option value="witty">Witty</option>
                  <option value="enthusiastic">Enthusiastic & Hype</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Target Platforms</label>
                <div className="flex space-x-2 mt-2">
                  <label className="inline-flex items-center">
                    <input type="checkbox" className="rounded border-zinc-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50" defaultChecked />
                    <span className="ml-2 text-sm text-zinc-700 dark:text-zinc-300">Instagram</span>
                  </label>
                  <label className="inline-flex items-center ml-4">
                    <input type="checkbox" className="rounded border-zinc-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50" defaultChecked />
                    <span className="ml-2 text-sm text-zinc-700 dark:text-zinc-300">TikTok</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
            <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-4">3. Schedule Settings</h3>
            
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Posting Frequency</label>
              <select className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-transparent text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none mb-2">
                <option value="1_per_day">1 post per day</option>
                <option value="2_per_day">2 posts per day</option>
                <option value="5_per_day">5 posts per day</option>
                <option value="custom">Custom schedule...</option>
              </select>
              <p className="text-xs text-zinc-500">The automation engine will space out your posts evenly throughout peak engagement hours based on this setting.</p>
            </div>
          </div>
        </div>

        {/* Right Col: Status */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-100 dark:border-blue-800 p-6 shadow-sm flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-white dark:bg-zinc-800 rounded-full shadow-md flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-1">Auto-Pilot is Off</h3>
            <p className="text-sm text-zinc-500 mb-6">Complete the setup on the left to activate the engine.</p>
            
            <button disabled className="w-full py-2 bg-zinc-300 dark:bg-zinc-700 text-zinc-500 text-sm font-medium rounded-md cursor-not-allowed transition">
              Activate Engine
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
