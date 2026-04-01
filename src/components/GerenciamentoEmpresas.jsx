import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import Modal from './ui/Modal';
import { useModal } from '../hooks/useModal';
import { useToast } from '../hooks/useToast';
import { useLanguage } from '../hooks/useLanguage';
import { FiBriefcase, FiPlus, FiEdit2, FiTrash2, FiCheck, FiX, FiMail, FiPhone, FiMapPin } from 'react-icons/fi';
function GerenciamentoEmpresas() {
  const {
    t
  } = useLanguage();
  const {
    modalState,
    showModal: showModalConfirm,
    closeModal
  } = useModal();
  const toast = useToast();
  const [empresas, setEmpresas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [modalFormularioAberto, setModalFormularioAberto] = useState(false);
  const [editando, setEditando] = useState(false);
  const [empresaSelecionada, setEmpresaSelecionada] = useState(null);
  const [superiorEmpresaId, setSuperiorEmpresaId] = useState(null);
  const [contextoEmpresaCarregado, setContextoEmpresaCarregado] = useState(false);
  const [dadosFormulario, setDadosFormulario] = useState({
    nome: '',
    cnpj: '',
    endereco: '',
    telefone: '',
    email: ''
  });
  useEffect(() => {
    carregarSuperiorEmpresaId();
  }, []);
  useEffect(() => {
    if (!contextoEmpresaCarregado) return;
    carregarEmpresas();
  }, [superiorEmpresaId, contextoEmpresaCarregado]);
  const carregarSuperiorEmpresaId = async () => {
    try {
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) {
        setSuperiorEmpresaId(null);
        return;
      }
      const {
        data: profile,
        error
      } = await supabase.from('profiles').select('superior_empresa_id').eq('id', user.id).single();
      if (error) throw error;
      setSuperiorEmpresaId(profile?.superior_empresa_id || null);
    } catch (error) {
      setSuperiorEmpresaId(null);
    } finally {
      setContextoEmpresaCarregado(true);
    }
  };
  const carregarEmpresas = async () => {
    try {
      setCarregando(true);
      let consulta = supabase.from('empresas').select('*').order('nome');
      if (superiorEmpresaId) {
        consulta = consulta.or(`id.eq.${superiorEmpresaId},superior_empresa_id.eq.${superiorEmpresaId}`);
      }
      const {
        data,
        error
      } = await consulta;
      if (error) throw error;
      setEmpresas(data || []);
    } catch (error) {
      toast.showError('Erro ao carregar empresas: ' + error.message);
    } finally {
      setCarregando(false);
    }
  };
  const aoAlterarCampo = e => {
    const {
      name,
      value
    } = e.target;
    if (name === 'cnpj') {
      const cnpjComMascara = value.replace(/\D/g, '').replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2').substring(0, 18);
      setDadosFormulario(prev => ({
        ...prev,
        [name]: cnpjComMascara
      }));
    } else {
      setDadosFormulario(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };
  const abrirModalNovo = () => {
    setEditando(false);
    setEmpresaSelecionada(null);
    setDadosFormulario({
      nome: '',
      cnpj: '',
      endereco: '',
      telefone: '',
      email: ''
    });
    setModalFormularioAberto(true);
  };
  const abrirModalEditar = empresa => {
    setEditando(true);
    setEmpresaSelecionada(empresa);
    setDadosFormulario({
      nome: empresa.nome || '',
      cnpj: empresa.cnpj || '',
      endereco: empresa.endereco || '',
      telefone: empresa.telefone || '',
      email: empresa.email || ''
    });
    setModalFormularioAberto(true);
  };
  const aoEnviarFormulario = async e => {
    e.preventDefault();
    try {
      if (editando && empresaSelecionada) {
        const {
          error
        } = await supabase.from('empresas').update({
          nome: dadosFormulario.nome,
          cnpj: dadosFormulario.cnpj || null,
          endereco: dadosFormulario.endereco || null,
          telefone: dadosFormulario.telefone || null,
          email: dadosFormulario.email || null
        }).eq('id', empresaSelecionada.id);
        if (error) throw error;
        toast.showSuccess(t('empresas.companyUpdated'));
      } else {
        const {
          error
        } = await supabase.from('empresas').insert({
          nome: dadosFormulario.nome,
          cnpj: dadosFormulario.cnpj || null,
          endereco: dadosFormulario.endereco || null,
          telefone: dadosFormulario.telefone || null,
          email: dadosFormulario.email || null,
          superior_empresa_id: superiorEmpresaId,
          is_active: true
        });
        if (error) throw error;
        toast.showSuccess(t('empresas.companyRegistered'));
      }
      setModalFormularioAberto(false);
      carregarEmpresas();
    } catch (error) {
      toast.showError('Erro ao salvar empresa: ' + error.message);
    }
  };
  const aoAlternarStatus = async empresa => {
    try {
      const {
        error
      } = await supabase.from('empresas').update({
        is_active: !empresa.is_active
      }).eq('id', empresa.id);
      if (error) throw error;
      if (empresa.is_active) {
        toast.showWarning(t('empresas.companyDeactivated'));
      } else {
        toast.showSuccess(t('empresas.companyActivated'));
      }
      carregarEmpresas();
    } catch (error) {
      toast.showError('Erro ao alterar status: ' + error.message);
    }
  };
  const aoExcluir = empresa => {
    showModalConfirm({
      title: 'Confirmar Exclusão',
      message: `${t('empresas.confirmDelete')} "${empresa.nome}"?\n\n${t('empresas.deleteWarning')}`,
      type: 'delete',
      showCancel: true,
      confirmText: 'Confirmar',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        try {
          const {
            error
          } = await supabase.from('empresas').delete().eq('id', empresa.id);
          if (error) throw error;
          toast.showSuccess(t('empresas.companyDeleted'));
          closeModal();
          carregarEmpresas();
        } catch (error) {
          toast.showError('Erro ao excluir empresa: ' + error.message);
        }
      }
    });
  };
  if (carregando) {
    return <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">{t('empresas.loadingCompanies')}</p>
        </div>
      </div>;
  }
  return <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <FiBriefcase className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-blue-600" />
            {t('administracao.companyManagement')}
          </h2>
        </div>
        <button onClick={abrirModalNovo} className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs sm:text-sm">
          <FiPlus className="w-4 h-4 sm:w-5 sm:h-5" />
          {t('administracao.addCompany')}
        </button>
      </div>

      {empresas.length === 0 ? <div className="yt-inset rounded-lg p-12 text-center border border-gray-200 dark:border-gray-700">
          <FiBriefcase className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300 text-lg mb-2">{t('empresas.noCompaniesRegistered')}</p>
          <p className="text-gray-500 dark:text-gray-400 mb-6">{t('empresas.firstCompanyPrompt')}</p>
          <button onClick={abrirModalNovo} className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <FiPlus className="w-5 h-5" />
            {t('empresas.registerFirstCompany')}
          </button>
        </div> : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {empresas.map(empresa => <div key={empresa.id} className={`yt-card shadow-md p-4 sm:p-6 border-2 transition-all ${empresa.is_active ? 'border-green-200 dark:border-green-800 hover:border-green-400 dark:hover:border-green-600' : 'border-gray-200 dark:border-gray-700 opacity-60'}`}>
              <div className="flex items-start justify-between mb-4 gap-2">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${empresa.is_active ? 'bg-blue-100 dark:bg-blue-950/50' : 'bg-gray-100 dark:bg-gray-800'}`}>
                    <FiBriefcase className={`w-5 h-5 sm:w-6 sm:h-6 ${empresa.is_active ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">{empresa.nome}</h3>
                    {empresa.cnpj && <p className="text-sm text-gray-500 dark:text-gray-400">CNPJ: {empresa.cnpj}</p>}
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${empresa.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'}`}>
                  {empresa.is_active ? t('administracao.active') : t('administracao.inactive')}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                {empresa.endereco && <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <FiMapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-500 dark:text-gray-500" />
                    <span>{empresa.endereco}</span>
                  </div>}
                {empresa.telefone && <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <FiPhone className="w-4 h-4 text-gray-500 dark:text-gray-500" />
                    <span>{empresa.telefone}</span>
                  </div>}
                {empresa.email && <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <FiMail className="w-4 h-4 text-gray-500 dark:text-gray-500" />
                    <span className="truncate">{empresa.email}</span>
                  </div>}
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button type="button" onClick={() => abrirModalEditar(empresa)} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-300 dark:border dark:border-blue-800/60 dark:hover:bg-blue-950/70">
                  <FiEdit2 className="w-4 h-4" />
                  {t('administracao.edit')}
                </button>
                <button type="button" onClick={() => aoAlternarStatus(empresa)} className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm font-medium min-w-[2.75rem] ${empresa.is_active ? 'bg-yellow-50 text-yellow-800 hover:bg-yellow-100 dark:bg-amber-950/45 dark:text-amber-200 dark:border dark:border-amber-900/50 dark:hover:bg-amber-950/65' : 'bg-green-50 text-green-800 hover:bg-green-100 dark:bg-green-950/45 dark:text-green-300 dark:border dark:border-green-900/50 dark:hover:bg-green-950/65'}`} title={empresa.is_active ? 'Desativar' : 'Ativar'}>
                  {empresa.is_active ? <FiX className="w-4 h-4" /> : <FiCheck className="w-4 h-4" />}
                </button>
                <button type="button" onClick={() => aoExcluir(empresa)} className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm font-medium min-w-[2.75rem] bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950/45 dark:text-red-300 dark:border dark:border-red-900/50 dark:hover:bg-red-950/65" title="Excluir">
                  <FiTrash2 className="w-4 h-4" />
                </button>
              </div>
            </div>)}
        </div>}

      <Modal isOpen={modalFormularioAberto} onClose={() => setModalFormularioAberto(false)} title={editando ? t('empresas.editCompany') : t('empresas.registerCompany')} type="info" showCancel={false}>
        <form onSubmit={aoEnviarFormulario} className="space-y-4 py-4">
          <div>
            <label className="block text-sm font-medium yt-label mb-2">
              {t('empresas.companyName')} *
            </label>
            <input type="text" name="nome" value={dadosFormulario.nome} onChange={aoAlterarCampo} required className="w-full px-3 py-2 rounded-md border yt-field focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400" placeholder={t('empresas.companyNamePlaceholder')} />
          </div>

          <div>
            <label className="block text-sm font-medium yt-label mb-2">
              {t('empresas.cnpj')}
            </label>
            <input type="text" name="cnpj" value={dadosFormulario.cnpj} onChange={aoAlterarCampo} className="w-full px-3 py-2 rounded-md border yt-field focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400" placeholder={t('empresas.cnpjPlaceholder')} />
          </div>

          <div>
            <label className="block text-sm font-medium yt-label mb-2">
              {t('empresas.address')}
            </label>
            <input type="text" name="endereco" value={dadosFormulario.endereco} onChange={aoAlterarCampo} className="w-full px-3 py-2 rounded-md border yt-field focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400" placeholder={t('empresas.addressPlaceholder')} />
          </div>

          <div>
            <label className="block text-sm font-medium yt-label mb-2">
              {t('empresas.phone')}
            </label>
            <input type="tel" name="telefone" value={dadosFormulario.telefone} onChange={aoAlterarCampo} className="w-full px-3 py-2 rounded-md border yt-field focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400" placeholder={t('empresas.phonePlaceholder')} />
          </div>

          <div>
            <label className="block text-sm font-medium yt-label mb-2">
              {t('empresas.email')}
            </label>
            <input type="email" name="email" value={dadosFormulario.email} onChange={aoAlterarCampo} className="w-full px-3 py-2 rounded-md border yt-field focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400" placeholder={t('empresas.emailPlaceholder')} />
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={() => setModalFormularioAberto(false)} className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600">
              {t('empresas.cancel')}
            </button>
            <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
              {editando ? t('empresas.update') : t('empresas.register')}
            </button>
          </div>
        </form>
      </Modal>

      {modalState.showCancel && <Modal isOpen={modalState.isOpen} onClose={closeModal} title={modalState.title} message={modalState.message} type={modalState.type} confirmText={modalState.confirmText} cancelText={modalState.cancelText} showCancel={modalState.showCancel} onConfirm={modalState.onConfirm} />}
    </div>;
}
export default GerenciamentoEmpresas;
