"use client";
import React, { useState, useEffect } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

export default function BrandsPage() {
  const [userName, setUserName] = useState('My Workspace');
  const [brandId, setBrandId] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('marketing_os_token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.brandId) setBrandId(payload.brandId);
        if (payload.email) setUserName(payload.email.split('@')[0]);
      } catch (e) {}
    }
  }, []);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Brand Management</h1>
          <p className="text-sm text-zinc-500 mt-1">Manage active brands and social workspaces operating inside your organization.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-md shadow-sm transition"
        >
          + Add New Brand
        </button>
      </div>

      <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm p-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          
          {/* Active Brand Card */}
          <div className="border border-blue-500/50 bg-blue-50/20 dark:bg-blue-900/10 rounded-xl p-6 flex flex-col items-center shadow-sm">
            <div className="h-16 w-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold mb-4 shadow-md">
              {userName.substring(0, 2).toUpperCase()}
            </div>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{userName}'s Brand</h3>
            <p className="text-xs text-zinc-500 mt-1">ID: {brandId || 'Primary Workspace'}</p>
            
            <div className="mt-4 flex items-center space-x-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                Active Brand
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* Add Brand Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Create New Brand</h3>
            <p className="text-xs text-zinc-500">Add a new brand workspace to manage separate social channels.</p>
            
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Brand Name</label>
              <input 
                type="text"
                value={newBrandName}
                onChange={(e) => setNewBrandName(e.target.value)}
                placeholder="e.g. Acme Media"
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-transparent text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <button 
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  setShowModal(false);
                  setNewBrandName('');
                }}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition shadow-sm"
              >
                Create Brand
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
