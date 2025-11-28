// TimeRecordsSummary.jsx
// Componente para mostrar resumo detalhado dos registros de ponto

import { useState } from 'react'
import { useLanguage } from '../hooks/useLanguage'
import { FiRefreshCw, FiClock, FiEye, FiEyeOff } from 'react-icons/fi'
import { formatDate } from '../utils/dateUtils'

function TimeRecordsSummary({ timeRecords, onRefresh, loading, error }) {
  const { t, currentLanguage } = useLanguage()
  const [showDetails, setShowDetails] = useState(false)

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{t('dashboard.timeRecordSummary')}</h3>
          <div className="text-sm text-gray-500">{t('common.loading')}...</div>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">{t('common.loading')}...</span>
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
          <h3 className="text-lg font-semibold text-gray-900">{t('dashboard.timeRecordSummary')}</h3>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="text-sm text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1"
            >
              <FiRefreshCw className="w-4 h-4" /> {t('common.refresh')}
            </button>
          )}
        </div>
        <div className="text-center py-8">
          <FiClock className="text-gray-400 w-12 h-12 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('dashboard.timeRecordSummary')}</h3>
          <p className="text-gray-500 mb-4">{t('dashboard.noTimeRecords')}</p>
          <button
            onClick={() => window.location.href = '/formulario-ponto'}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            {t('dashboard.registerTime')}
          </button>
        </div>
      </div>
    )
  }

  // Calcular estatísticas (mesma lógica do gráfico "Horas da Semana")
  const totalHoras = timeRecords.reduce((total, record) => {
    let minutos = 0

    // Primeira jornada (ex: 08:00 - 12:00 = 4h)
    if (record.entrada1 && record.saida1) {
      const entrada1 = new Date(`2000-01-01T${record.entrada1}`)
      const saida1 = new Date(`2000-01-01T${record.saida1}`)
      minutos += (saida1 - entrada1) / (1000 * 60)
    }

    // Segunda jornada (ex: 13:00 - 18:00 = 5h)
    if (record.entrada2 && record.saida2) {
      const entrada2 = new Date(`2000-01-01T${record.entrada2}`)
      const saida2 = new Date(`2000-01-01T${record.saida2}`)
      minutos += (saida2 - entrada2) / (1000 * 60)
    }

    // ✅ NÃO subtrair pausas - o intervalo de almoço JÁ está fora do cálculo
    // O tempo entre saida1 (12:00) e entrada2 (13:00) não é contabilizado
    // Exemplo: 08-12 (4h) + 13-18 (5h) = 9h trabalhadas (o almoço 12-13 já está excluído)

    return total + minutos
  }, 0)

  const horas = Math.floor(totalHoras / 60)
  const minutos = Math.floor(totalHoras % 60)
  const diasTrabalhados = timeRecords.length

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{t('dashboard.timeRecordSummary')}</h3>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 transition-colors"
        >
          {showDetails ? (
            <>
              <FiEyeOff className="w-4 h-4" />
              {t('common.hide')}
            </>
          ) : (
            <>
              <FiEye className="w-4 h-4" />
              {t('dashboard.viewDetails')}
            </>
          )}
        </button>
      </div>

      {/* Estatísticas Gerais */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
        <div className="text-center p-3 sm:p-4 bg-blue-50 rounded-lg">
          <div className="text-xl sm:text-2xl font-bold text-blue-600">
            {horas}h {minutos}m
          </div>
          <div className="text-xs sm:text-sm text-blue-800">{t('dashboard.totalHours')}</div>
        </div>

        <div className="text-center p-3 sm:p-4 bg-green-50 rounded-lg">
          <div className="text-xl sm:text-2xl font-bold text-green-600">
            {diasTrabalhados}
          </div>
          <div className="text-xs sm:text-sm text-green-800">{t('dashboard.workedDays')}</div>
        </div>

        <div className="text-center p-3 sm:p-4 bg-purple-50 rounded-lg">
          <div className="text-xl sm:text-2xl font-bold text-purple-600">
            {diasTrabalhados > 0 ? Math.round(totalHoras / diasTrabalhados / 60 * 10) / 10 : 0}h
          </div>
          <div className="text-xs sm:text-sm text-purple-800">{t('dashboard.averagePerDay')}</div>
        </div>
      </div>

      {/* Detalhes dos Registros */}
      {showDetails && (
        <div className="border-t pt-4">
          <h4 className="text-md font-semibold text-gray-900 mb-3">{t('dashboard.detailedRecords')}</h4>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {timeRecords.map((record, index) => (
              <div key={record.id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="font-medium text-gray-900">
                    {formatDate(record.data, 'DD/MM/YYYY')}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {record.entrada1 && `${t('history.entry1')}: ${record.entrada1}`}
                    {record.saida1 && ` | ${t('history.exit1')}: ${record.saida1}`}
                    {record.entrada2 && ` | ${t('history.entry2')}: ${record.entrada2}`}
                    {record.saida2 && ` | ${t('history.exit2')}: ${record.saida2}`}
                  </div>
                  {record.observacao && (
                    <div className="text-sm text-blue-600 mt-1 flex items-center gap-1">
                      <span className="inline-flex items-center justify-center w-4 h-4 bg-blue-100 rounded-full text-blue-600 font-semibold text-xs">i</span>
                      {record.observacao}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {(() => {
                      let minutos = 0

                      // Primeira jornada
                      if (record.entrada1 && record.saida1) {
                        const entrada1 = new Date(`2000-01-01T${record.entrada1}`)
                        const saida1 = new Date(`2000-01-01T${record.saida1}`)
                        minutos += (saida1 - entrada1) / (1000 * 60)
                      }

                      // Segunda jornada
                      if (record.entrada2 && record.saida2) {
                        const entrada2 = new Date(`2000-01-01T${record.entrada2}`)
                        const saida2 = new Date(`2000-01-01T${record.saida2}`)
                        minutos += (saida2 - entrada2) / (1000 * 60)
                      }

                      // ✅ NÃO subtrair pausas - já excluídas pelo cálculo de jornadas

                      const h = Math.floor(minutos / 60)
                      const m = Math.floor(minutos % 60)

                      return minutos > 0 ? `${h}h ${m}m` : '0h 0m'
                    })()}
                  </div>
                  <div className="text-xs text-gray-500">
                    {record.pausa_almoco > 0 && `${record.pausa_almoco}min ${t('common.break')}`}
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
