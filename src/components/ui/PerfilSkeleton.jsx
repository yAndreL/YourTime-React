import React from 'react'

const PerfilSkeleton = () => {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden relative">
        {/* Animação de shimmer */}
        <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-blue-100/30 to-transparent z-10"></div>
        
        <div className="p-6 relative z-20">
          {/* Upload de Foto de Perfil */}
          <div className="flex items-center justify-center mb-4 pb-3 border-b border-gray-200">
            <div className="text-center">
              <div className="relative inline-block">
                {/* Avatar skeleton */}
                <div className="w-20 h-20 bg-gray-200 rounded-full"></div>
                {/* Camera icon skeleton */}
                <div className="absolute bottom-0 right-0 bg-gray-100 rounded-full p-1.5 shadow-md border-2 border-gray-200">
                  <div className="w-4 h-4 bg-gray-200 rounded"></div>
                </div>
              </div>
              <div className="mt-2 h-3 bg-gray-200 rounded w-44 mx-auto"></div>
            </div>
          </div>

          {/* Grid de 2 Colunas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
            {/* Coluna Esquerda - Dados do Perfil */}
            <div className="flex flex-col">
              {/* Nome e Cargo */}
              <div className="mb-4">
                <div className="h-6 bg-gray-200 rounded w-40 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-32"></div>
              </div>
              
              <div className="space-y-3">
                {/* Email */}
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="w-3.5 h-3.5 bg-gray-200 rounded"></div>
                    <div className="h-3 bg-gray-200 rounded w-12"></div>
                  </div>
                  <div className="h-9 bg-gray-100 rounded-md"></div>
                </div>
                
                {/* Cargo */}
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="w-3.5 h-3.5 bg-gray-200 rounded"></div>
                    <div className="h-3 bg-gray-200 rounded w-12"></div>
                  </div>
                  <div className="h-9 bg-gray-100 rounded-md"></div>
                </div>
                
                {/* Departamento */}
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="w-3.5 h-3.5 bg-gray-200 rounded"></div>
                    <div className="h-3 bg-gray-200 rounded w-24"></div>
                  </div>
                  <div className="h-9 bg-gray-100 rounded-md"></div>
                </div>
                
                {/* Data de Admissão */}
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="w-3.5 h-3.5 bg-gray-200 rounded"></div>
                    <div className="h-3 bg-gray-200 rounded w-32"></div>
                  </div>
                  <div className="h-9 bg-gray-100 rounded-md"></div>
                </div>
                
                {/* Carga Horária */}
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="w-3.5 h-3.5 bg-gray-200 rounded"></div>
                    <div className="h-3 bg-gray-200 rounded w-40"></div>
                  </div>
                  <div className="h-9 bg-gray-100 rounded-md"></div>
                </div>
              </div>
            </div>
            
            {/* Coluna Direita - Estatísticas */}
            <div className="flex flex-col">
              <div className="h-6 bg-gray-200 rounded w-48 mb-3"></div>
              
              <div className="space-y-3">
                {/* Horas Trabalhadas */}
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                  <div className="h-3 bg-blue-200 rounded w-32 mb-2"></div>
                  <div className="h-8 bg-blue-200 rounded w-20"></div>
                </div>

                {/* Saldo de Horas */}
                <div className="bg-gradient-to-r from-red-50 to-red-100 p-4 rounded-lg border border-red-200">
                  <div className="h-3 bg-red-200 rounded w-28 mb-2"></div>
                  <div className="h-8 bg-red-200 rounded w-24"></div>
                </div>

                {/* Projetos Ativos */}
                <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
                  <div className="h-3 bg-purple-200 rounded w-28 mb-2"></div>
                  <div className="h-8 bg-purple-200 rounded w-8"></div>
                </div>
              </div>

              {/* Nota informativa */}
              <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-full"></div>
                  <div className="h-3 bg-gray-200 rounded w-full"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="mt-6 pt-6 border-t border-gray-200 flex gap-3">
            <div className="h-10 bg-gray-200 rounded-lg w-32"></div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PerfilSkeleton
