import React from 'react';
const ConfiguracoesSkeleton = () => {
  return <div className="max-w-4xl mx-auto">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md border border-gray-200/80 dark:border-gray-700/80 p-8 overflow-hidden relative">
        <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-blue-100/30 dark:via-blue-900/25 to-transparent z-10"></div>

        <div className="space-y-8 relative z-20">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/60 rounded-lg border border-gray-200/80 dark:border-gray-700/80">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-950/50 rounded-lg"></div>
                  <div>
                    <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-40 mb-2"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-56"></div>
                  </div>
                </div>
                <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 rounded-full"></div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/60 rounded-lg border border-gray-200/80 dark:border-gray-700/80">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 dark:bg-orange-950/40 rounded-lg"></div>
                  <div>
                    <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-44 mb-2"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-96 max-w-full"></div>
                  </div>
                </div>
                <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 rounded-full"></div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-36 mb-2"></div>
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
              </div>

              <div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-40 mb-2"></div>
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
              </div>

              <div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-2"></div>
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
              </div>

              <div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-28 mb-2"></div>
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-56"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-44 mb-2"></div>
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800/60 rounded-lg border border-gray-200/80 dark:border-gray-700/80">
                <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-48"></div>
              </div>
            </div>
          </div>

          <div className="flex gap-4 border-t border-gray-200 dark:border-gray-700 pt-8">
            <div className="h-11 bg-gray-200 dark:bg-gray-700 rounded-lg w-48"></div>
            <div className="h-11 bg-gray-200 dark:bg-gray-700 rounded-lg w-56"></div>
          </div>
        </div>
      </div>
    </div>;
};
export default ConfiguracoesSkeleton;
