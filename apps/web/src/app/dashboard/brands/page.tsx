export default function BrandsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Brands</h1>
          <p className="text-sm text-zinc-500 mt-1">Manage the brands operating inside this organization.</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-md shadow-sm transition">
          + Add New Brand
        </button>
      </div>

      <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm overflow-hidden">
        <div className="p-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Example Brand Card */}
            <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-5 flex flex-col items-center hover:border-blue-500 transition cursor-pointer">
              <div className="h-16 w-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xl font-bold mb-4">
                GH
              </div>
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">GO HARD Luxury</h3>
              <p className="text-sm text-zinc-500">Retail & Apparel</p>
              <div className="mt-4 flex items-center space-x-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  4 Connected Accounts
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
