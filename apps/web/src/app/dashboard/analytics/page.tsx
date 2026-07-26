"use client";
import React, { useState } from 'react';

export default function AnalyticsPage() {
  const [logs, setLogs] = useState<any[]>([]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Publishing Logs</h1>
        <p className="text-sm text-zinc-500 mt-1">Monitor the status of your automated posts and background jobs.</p>
      </div>

      <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm overflow-hidden p-6">
        {logs.length === 0 ? (
          <div className="text-center py-12">
            <div className="h-12 w-12 rounded-full bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center mx-auto mb-4 text-zinc-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">No publishing logs yet</h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              Once you schedule and publish posts through the Post Composer or Google Drive Auto-Pilot, live status logs will appear here.
            </p>
          </div>
        ) : (
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
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                {/* Dynamic logs map here */}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
