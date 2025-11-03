import React from 'react'

const ProjetoCardSkeleton = () => {
  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-300 p-6 overflow-hidden relative">
      {/* Animação de shimmer */}
      <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-blue-100/30 to-transparent z-10"></div>
      
      <div className="relative z-20">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-4 h-4 rounded-full bg-gray-200"></div>
              <div className="h-6 bg-gray-200 rounded w-48"></div>
              <div className="px-2 py-1 h-6 bg-gray-200 rounded-full w-16"></div>
              <div className="px-2 py-1 h-6 bg-gray-200 rounded-full w-16"></div>
            </div>
            
            {/* Descrição */}
            <div className="space-y-2 mb-3">
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>

            {/* Grid de informações */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="h-4 bg-gray-200 rounded w-20 mb-1"></div>
                <div className="h-4 bg-gray-200 rounded w-32"></div>
              </div>
              <div>
                <div className="h-4 bg-gray-200 rounded w-24 mb-1"></div>
                <div className="h-4 bg-gray-200 rounded w-28"></div>
              </div>
              <div>
                <div className="h-4 bg-gray-200 rounded w-16 mb-1"></div>
                <div className="h-4 bg-gray-200 rounded w-36"></div>
              </div>
              <div>
                <div className="h-4 bg-gray-200 rounded w-20 mb-1"></div>
                <div className="h-4 bg-gray-200 rounded w-24"></div>
              </div>
            </div>
          </div>
          
          {/* Botões de ação */}
          <div className="flex gap-2">
            <div className="w-9 h-9 bg-gray-200 rounded-lg"></div>
            <div className="w-9 h-9 bg-gray-200 rounded-lg"></div>
          </div>
        </div>

        {/* Barra de progresso */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex justify-between items-center mb-2">
            <div className="h-4 bg-gray-200 rounded w-32"></div>
            <div className="h-4 bg-gray-200 rounded w-20"></div>
          </div>
          <div className="w-full h-3 bg-gray-200 rounded-full"></div>
        </div>
      </div>
    </div>
  )
}

const GerenciamentoProjetosSkeleton = () => {
  return (
    <div>
      {/* Cards de Status */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        {[...Array(5)].map((_, index) => (
          <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 overflow-hidden relative">
            <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-blue-100/30 to-transparent"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <div className="h-6 bg-gray-200 rounded w-12"></div>
                <div className="w-5 h-5 bg-gray-200 rounded"></div>
              </div>
              <div className="h-4 bg-gray-200 rounded w-20"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6 overflow-hidden relative">
        <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-blue-100/30 to-transparent"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative z-10">
          {[...Array(4)].map((_, index) => (
            <div key={index}>
              <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
              <div className="h-10 bg-gray-200 rounded w-full"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Lista de Projetos */}
      <div className="space-y-4">
        {[...Array(3)].map((_, index) => (
          <ProjetoCardSkeleton key={index} />
        ))}
      </div>
    </div>
  )
}

export default GerenciamentoProjetosSkeleton
