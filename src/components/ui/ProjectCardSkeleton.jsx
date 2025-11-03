import React from 'react'

const ProjectCardSkeleton = () => {
  return (
    <div 
      className="border-2 border-gray-200 rounded-lg p-4 relative overflow-hidden bg-gradient-to-br from-gray-50 to-white"
      style={{ minWidth: '320px', maxWidth: '320px' }}
    >
      {/* Animação de shimmer brilhante */}
      <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-blue-100/30 to-transparent"></div>
      
      {/* Indicador de seleção no canto superior direito */}
      <div className="absolute top-3 right-3 z-10">
        <div className="w-6 h-6 rounded-full border-2 border-gray-200 bg-gray-100"></div>
      </div>

      {/* Header com cor indicadora e título */}
      <div className="flex items-center gap-2 mb-3 pr-8 relative z-10">
        <div className="w-3 h-3 rounded-full bg-gray-200 flex-shrink-0"></div>
        <div className="h-4 bg-gray-200 rounded flex-1 max-w-[180px]"></div>
      </div>
      
      {/* Descrição (2 linhas) */}
      <div className="space-y-2 mb-3 relative z-10">
        <div className="h-3 bg-gray-200 rounded w-full"></div>
        <div className="h-3 bg-gray-200 rounded w-3/4"></div>
      </div>
      
      {/* Empresa */}
      <div className="mb-3 relative z-10">
        <div className="h-3 bg-gray-200 rounded w-2/3"></div>
      </div>
      
      {/* Informações de horas */}
      <div className="space-y-2 pt-3 border-t border-gray-200 relative z-10">
        <div className="flex justify-between items-center">
          <div className="h-3 bg-gray-200 rounded w-32"></div>
          <div className="h-3 bg-gray-200 rounded w-12"></div>
        </div>
        <div className="flex justify-between items-center">
          <div className="h-3 bg-gray-200 rounded w-28"></div>
          <div className="h-3 bg-gray-200 rounded w-12"></div>
        </div>
        <div className="flex justify-between items-center">
          <div className="h-3 bg-gray-200 rounded w-24"></div>
          <div className="h-3 bg-gray-200 rounded w-16"></div>
        </div>
      </div>
    </div>
  )
}

const ProjectsLoadingSkeleton = ({ count = 4 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <ProjectCardSkeleton key={index} />
      ))}
    </div>
  )
}

export default ProjectsLoadingSkeleton
