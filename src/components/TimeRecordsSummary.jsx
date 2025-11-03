// TimeRecordsSummary.jsx
// Componente para mostrar resumo detalhado dos registros de ponto

import { useState } from 'react'
import { FiRefreshCw, FiClock, FiEye, FiEyeOff } from 'react-icons/fi'

function TimeRecordsSummary({ timeRecords, onRefresh, loading, error }) {
  const [showDetails, setShowDetails] = useState(false)

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Resumo de Ponto</h3>
          <div className="text-sm text-gray-500">Carregando...</div>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Carregando registros...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Resumo de Ponto</h3>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="text-sm text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1"
            >
              <FiRefreshCw className="w-4 h-4" /> Atualizar
            </button>
          )}
        </div>
        <div className="text-center py-8">
          <div className="text-red-400 text-4xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-red-900 mb-2">Erro ao Carregar Dados</h3>
          <p className="text-red-600 mb-4">{error}</p>
        </div>
      </div>
    )
  }

  if (!timeRecords || timeRecords.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Resumo de Ponto</h3>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="text-sm text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1"
            >
              <FiRefreshCw className="w-4 h-4" /> Atualizar
            </button>
          )}
        </div>
        <div className="text-center py-8">
          <FiClock className="text-gray-400 w-12 h-12 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum Registro de Ponto</h3>
          <p className="text-gray-500 mb-4">Ainda não há registros de ponto cadastrados para esta semana.</p>
          <button
            onClick={() => window.location.href = '/formulario-ponto'}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Registrar Primeiro Ponto
          </button>
        </div>
      </div>
    )
  }

  // Calcular estatísticas
  const totalHoras = timeRecords.reduce((total, record) => {
    let minutos = 0

    if (record.entrada1 && record.saida1) {
      const entrada1 = new Date(`2000-01-01T${record.entrada1}`)
      const saida1 = new Date(`2000-01-01T${record.saida1}`)
      minutos += (saida1 - entrada1) / (1000 * 60)
    }

    if (record.entrada2 && record.saida2) {
      const entrada2 = new Date(`2000-01-01T${record.entrada2}`)
      const saida2 = new Date(`2000-01-01T${record.saida2}`)
      minutos += (saida2 - entrada2) / (1000 * 60)
    }

    minutos -= (record.pausa_almoco || 0)
    minutos -= (record.pausas_extras || 0)

    return total + minutos
  }, 0)

  const horas = Math.floor(totalHoras / 60)
  const minutos = Math.floor(totalHoras % 60)
  const diasTrabalhados = timeRecords.length

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Resumo de Ponto</h3>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 transition-colors"
        >
          {showDetails ? (
            <>
              <FiEyeOff className="w-4 h-4" />
              Ocultar Detalhes
            </>
          ) : (
            <>
              <FiEye className="w-4 h-4" />
              Ver Detalhes
            </>
          )}
        </button>
      </div>

      {/* Estatísticas Gerais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">
            {horas}h {minutos}m
          </div>
          <div className="text-sm text-blue-800">Total de Horas</div>
        </div>

        <div className="text-center p-4 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">
            {diasTrabalhados}
          </div>
          <div className="text-sm text-green-800">Dias Trabalhados</div>
        </div>

        <div className="text-center p-4 bg-purple-50 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">
            {diasTrabalhados > 0 ? Math.round(totalHoras / diasTrabalhados / 60 * 10) / 10 : 0}h
          </div>
          <div className="text-sm text-purple-800">Média por Dia</div>
        </div>
      </div>

      {/* Detalhes dos Registros */}
      {showDetails && (
        <div className="border-t pt-4">
          <h4 className="text-md font-semibold text-gray-900 mb-3">Registros Detalhados</h4>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {timeRecords.map((record, index) => (
              <div key={record.id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="font-medium text-gray-900">
                    {new Date(record.data).toLocaleDateString('pt-BR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'short'
                    })}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {record.entrada1 && `Entrada: ${record.entrada1}`}
                    {record.saida1 && ` | Saída: ${record.saida1}`}
                    {record.entrada2 && ` | Entrada 2: ${record.entrada2}`}
                    {record.saida2 && ` | Saída 2: ${record.saida2}`}
                  </div>
                  {record.observacao && (
                    <div className="text-sm text-blue-600 mt-1">
                      📝 {record.observacao}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {(() => {
                      let minutos = 0

                      if (record.entrada1 && record.saida1) {
                        const entrada1 = new Date(`2000-01-01T${record.entrada1}`)
                        const saida1 = new Date(`2000-01-01T${record.saida1}`)
                        minutos += (saida1 - entrada1) / (1000 * 60)
                      }

                      if (record.entrada2 && record.saida2) {
                        const entrada2 = new Date(`2000-01-01T${record.entrada2}`)
                        const saida2 = new Date(`2000-01-01T${record.saida2}`)
                        minutos += (saida2 - entrada2) / (1000 * 60)
                      }

                      minutos -= (record.pausa_almoco || 0)
                      minutos -= (record.pausas_extras || 0)

                      const h = Math.floor(minutos / 60)
                      const m = Math.floor(minutos % 60)

                      return minutos > 0 ? `${h}h ${m}m` : '0h 0m'
                    })()}
                  </div>
                  <div className="text-xs text-gray-500">
                    {record.pausa_almoco > 0 && `${record.pausa_almoco}min almoço`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default TimeRecordsSummary
