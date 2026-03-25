import React from 'react';
const PerfilSkeleton = () => {
  return <div className="max-w-4xl mx-auto">
      <div className="yt-card shadow-md overflow-hidden relative">
        <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-blue-100/30 dark:via-blue-900/20 to-transparent z-10"></div>
        
        <div className="p-6 relative z-20">
          <div className="flex items-center justify-center mb-4 pb-3 border-b border-gray-200 dark:border-gray-800">
            <div className="text-center">
              <div className="relative inline-block">
                <div className="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                <div className="absolute bottom-0 right-0 bg-gray-100 dark:bg-gray-800 rounded-full p-1.5 shadow-md border-2 border-gray-200 dark:border-gray-700">
                  <div className="w-4 h-4 bg-gray-200 dark:bg-gray-600 rounded"></div>
                </div>
              </div>
              <div className="mt-2 h-3 bg-gray-200 dark:bg-gray-700 rounded w-44 mx-auto"></div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
            <div className="flex flex-col">
              <div className="mb-4">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-40 mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="w-3.5 h-3.5 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-12"></div>
                  </div>
                  <div className="h-9 bg-gray-100 dark:bg-gray-800 rounded-md"></div>
                </div>
                
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="w-3.5 h-3.5 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-12"></div>
                  </div>
                  <div className="h-9 bg-gray-100 dark:bg-gray-800 rounded-md"></div>
                </div>
                
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="w-3.5 h-3.5 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                  </div>
                  <div className="h-9 bg-gray-100 dark:bg-gray-800 rounded-md"></div>
                </div>
                
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="w-3.5 h-3.5 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                  </div>
                  <div className="h-9 bg-gray-100 dark:bg-gray-800 rounded-md"></div>
                </div>
                
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="w-3.5 h-3.5 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-40"></div>
                  </div>
                  <div className="h-9 bg-gray-100 dark:bg-gray-800 rounded-md"></div>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-3"></div>
              
              <div className="space-y-3">
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-950/30 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="h-3 bg-blue-200 dark:bg-blue-900/60 rounded w-32 mb-2"></div>
                  <div className="h-8 bg-blue-200 dark:bg-blue-900/60 rounded w-20"></div>
                </div>

                <div className="bg-gradient-to-r from-red-50 to-red-100 dark:from-red-950/40 dark:to-red-950/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
                  <div className="h-3 bg-red-200 dark:bg-red-900/60 rounded w-28 mb-2"></div>
                  <div className="h-8 bg-red-200 dark:bg-red-900/60 rounded w-24"></div>
                </div>

                <div className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-950/40 dark:to-purple-950/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                  <div className="h-3 bg-purple-200 dark:bg-purple-900/60 rounded w-28 mb-2"></div>
                  <div className="h-8 bg-purple-200 dark:bg-purple-900/60 rounded w-8"></div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800/60 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-800 flex gap-3">
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg w-32"></div>
          </div>
        </div>
      </div>
    </div>;
};
export default PerfilSkeleton;
