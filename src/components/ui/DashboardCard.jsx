


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
      <div className={`bg-white rounded-lg shadow-sm p-6 ${className}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className={`text-2xl font-bold ${valueColor}`}>{value}</p>
          </div>
          <div className={`w-12 h-12 ${bgColor} rounded-lg flex items-center justify-center`}>
            {iconElement ? iconElement : (
              <span className={`${textColor} text-xl`}>{icon}</span>
            )}
          </div>
        </div>
      </div>
    )
  }
  
  export default DashboardCard
