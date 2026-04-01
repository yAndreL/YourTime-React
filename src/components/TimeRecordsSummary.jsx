import { useState } from 'react';
import { useLanguage } from '../hooks/useLanguage';
import { FiRefreshCw, FiClock, FiEye, FiEyeOff } from 'react-icons/fi';
import { formatarData } from '../utils/dateUtils';
function TimeRecordsSummary({
  registrosApontamento,
  aoRecarregar,
  carregandoResumo,
  mensagemErro
}) {
  const { t } = useLanguage();
  const [exibirDetalhesLista, setExibirDetalhesLista] = useState(false);
  if (carregandoResumo) {
    return <div className="yt-card p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('painel.timeRecordSummary')}</h3>
          <div className="text-sm text-gray-500 dark:text-gray-400">{t('comum.loading')}...</div>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-500"></div>
          <span className="ml-2 text-gray-600 dark:text-gray-300">{t('comum.loading')}...</span>
        </div>
      </div>;
  }
  if (mensagemErro) {
    return <div className="yt-card p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Resumo de Ponto</h3>
          {aoRecarregar && <button type="button" onClick={aoRecarregar} className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors flex items-center gap-1">
              <FiRefreshCw className="w-4 h-4" /> Atualizar
            </button>}
        </div>
        <div className="text-center py-8">
          <div className="text-red-400 text-4xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-red-800 dark:text-red-300 mb-2">Erro ao Carregar Dados</h3>
          <p className="text-red-600 dark:text-red-400 mb-4">{mensagemErro}</p>
        </div>
      </div>;
  }
  if (!registrosApontamento || registrosApontamento.length === 0) {
    return <div className="yt-card p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('painel.timeRecordSummary')}</h3>
          {aoRecarregar && <button type="button" onClick={aoRecarregar} className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors flex items-center gap-1">
              <FiRefreshCw className="w-4 h-4" /> {t('comum.refresh')}
            </button>}
        </div>
        <div className="text-center py-8">
          <FiClock className="text-gray-400 dark:text-gray-500 w-12 h-12 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{t('painel.timeRecordSummary')}</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">{t('painel.noTimeRecords')}</p>
          <button type="button" onClick={() => window.location.href = '/formulario-ponto'} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
            {t('painel.registerTime')}
          </button>
        </div>
      </div>;
  }
  const totalHoras = registrosApontamento.reduce((total, record) => {
    let minutos = 0;
    if (record.entrada1 && record.saida1) {
      const entrada1 = new Date(`2000-01-01T${record.entrada1}`);
      const saida1 = new Date(`2000-01-01T${record.saida1}`);
      minutos += (saida1 - entrada1) / (1000 * 60);
    }
    if (record.entrada2 && record.saida2) {
      const entrada2 = new Date(`2000-01-01T${record.entrada2}`);
      const saida2 = new Date(`2000-01-01T${record.saida2}`);
      minutos += (saida2 - entrada2) / (1000 * 60);
    }
    return total + minutos;
  }, 0);
  const horas = Math.floor(totalHoras / 60);
  const minutos = Math.floor(totalHoras % 60);
  const diasTrabalhados = registrosApontamento.length;
  return <div className="yt-card p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('painel.timeRecordSummary')}</h3>
        <button type="button" onClick={() => setExibirDetalhesLista(!exibirDetalhesLista)} className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors">
          {exibirDetalhesLista ? <>
              <FiEyeOff className="w-4 h-4" />
              {t('comum.hide')}
            </> : <>
              <FiEye className="w-4 h-4" />
              {t('painel.viewDetails')}
            </>}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
        <div className="text-center p-3 sm:p-4 bg-blue-50 dark:bg-blue-950/40 rounded-lg border border-blue-100 dark:border-blue-900/50">
          <div className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">
            {horas}h {minutos}m
          </div>
          <div className="text-xs sm:text-sm text-blue-800 dark:text-blue-200">{t('painel.totalHours')}</div>
        </div>

        <div className="text-center p-3 sm:p-4 bg-green-50 dark:bg-green-950/40 rounded-lg border border-green-100 dark:border-green-900/50">
          <div className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">
            {diasTrabalhados}
          </div>
          <div className="text-xs sm:text-sm text-green-800 dark:text-green-200">{t('painel.workedDays')}</div>
        </div>

        <div className="text-center p-3 sm:p-4 bg-purple-50 dark:bg-purple-950/40 rounded-lg border border-purple-100 dark:border-purple-900/50">
          <div className="text-xl sm:text-2xl font-bold text-purple-600 dark:text-purple-400">
            {diasTrabalhados > 0 ? Math.round(totalHoras / diasTrabalhados / 60 * 10) / 10 : 0}h
          </div>
          <div className="text-xs sm:text-sm text-purple-800 dark:text-purple-200">{t('painel.averagePerDay')}</div>
        </div>
      </div>

      {exibirDetalhesLista && <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <h4 className="text-md font-semibold text-gray-900 dark:text-gray-100 mb-3">{t('painel.detailedRecords')}</h4>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {registrosApontamento.map((record, index) => <div key={record.id || index} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 yt-inset rounded-lg border border-gray-200/80 dark:border-gray-700/80">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm sm:text-base text-gray-900 dark:text-gray-100">
                    {formatarData(record.data, 'DD/MM/YYYY')}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
                    {record.entrada1 && <span>{t('historico.entry1')}: {record.entrada1}</span>}
                    {record.saida1 && <span>{t('historico.exit1')}: {record.saida1}</span>}
                    {record.entrada2 && <span>{t('historico.entry2')}: {record.entrada2}</span>}
                    {record.saida2 && <span>{t('historico.exit2')}: {record.saida2}</span>}
                  </div>
                  {record.observacao && <div className="text-sm text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-1">
                      <span className="inline-flex items-center justify-center w-4 h-4 bg-blue-100 dark:bg-blue-900/60 rounded-full text-blue-600 dark:text-blue-300 font-semibold text-xs">i</span>
                      {record.observacao}
                    </div>}
                </div>
                <div className="text-left sm:text-right flex-shrink-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {(() => {
                let minutos = 0;
                if (record.entrada1 && record.saida1) {
                  const entrada1 = new Date(`2000-01-01T${record.entrada1}`);
                  const saida1 = new Date(`2000-01-01T${record.saida1}`);
                  minutos += (saida1 - entrada1) / (1000 * 60);
                }
                if (record.entrada2 && record.saida2) {
                  const entrada2 = new Date(`2000-01-01T${record.entrada2}`);
                  const saida2 = new Date(`2000-01-01T${record.saida2}`);
                  minutos += (saida2 - entrada2) / (1000 * 60);
                }
                const h = Math.floor(minutos / 60);
                const m = Math.floor(minutos % 60);
                return minutos > 0 ? `${h}h ${m}m` : '0h 0m';
              })()}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {record.pausa_almoco > 0 && `${record.pausa_almoco}min ${t('comum.break')}`}
                  </div>
                </div>
              </div>)}
          </div>
        </div>}
    </div>;
}
export default TimeRecordsSummary;
