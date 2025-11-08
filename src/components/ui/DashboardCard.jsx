


function DashboardCard({ 
    title, 
    value, 
    icon, 
    bgColor = 'bg-gray-100', 
    textColor = 'text-gray-600',
    valueColor = 'text-gray-900',
    iconElement = null,
    className = '' 
  }) {
    return (
      <div className={`bg-white rounded-lg shadow-sm p-4 sm:p-6 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm font-medium text-gray-500 truncate">{title}</p>
            <p className={`text-lg sm:text-2xl font-bold ${valueColor} truncate`}>{value}</p>
          </div>
          <div className={`w-10 h-10 sm:w-12 sm:h-12 ${bgColor} rounded-lg flex items-center justify-center flex-shrink-0 ml-2`}>
            {iconElement ? iconElement : (
              <span className={`${textColor} text-lg sm:text-xl`}>{icon}</span>
            )}
          </div>
        </div>
      </div>
    )
  }
  
  export default DashboardCard
