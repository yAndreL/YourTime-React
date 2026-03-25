import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../config/supabase.js';
import { useToast } from '../../hooks/useToast';
import { useLanguage } from '../../hooks/useLanguage';
import { FiUser, FiMail, FiPhone, FiBriefcase, FiCalendar, FiClock, FiLock, FiCheck, FiArrowLeft } from 'react-icons/fi';
function CadastroUser() {
  const {
    t
  } = useLanguage();
  const {
    showSuccess,
    showError
  } = useToast();
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    acesso: 'user',
    departamento: '',
    carga_horaria: 40,
    senha: '',
    confirmarSenha: ''
  });
  const [loading, setLoading] = useState(false);
  const [empresas, setEmpresas] = useState([]);
  const [empresasSelecionadas, setEmpresasSelecionadas] = useState([]);
  const [superiorEmpresaId, setSuperiorEmpresaId] = useState(null);
  const [emailError, setEmailError] = useState('');
  const [telefoneError, setTelefoneError] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [telefoneTouched, setTelefoneTouched] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
    const carregarEmpresas = async () => {
      try {
        const {
          data: {
            user
          }
        } = await supabase.auth.getUser();
        if (!user) return;
        const {
          data: profile
        } = await supabase.from('profiles').select('superior_empresa_id').eq('id', user.id).single();
        const empresaIdFiltro = profile?.superior_empresa_id;
        if (!empresaIdFiltro) {
          return;
        }
        setSuperiorEmpresaId(empresaIdFiltro);
        const {
          data,
          error
        } = await supabase.from('empresas').select('id, nome, cnpj').eq('is_active', true).or(`id.eq.${empresaIdFiltro},superior_empresa_id.eq.${empresaIdFiltro}`).order('nome');
        if (!error && data) {
          setEmpresas(data);
        }
      } catch (error) {}
    };
    carregarEmpresas();
  }, []);
  const handleChange = e => {
    const {
      name,
      value
    } = e.target;
    if (name === 'telefone') {
      const cleaned = value.replace(/\D/g, '');
      let formatted = cleaned;
      if (cleaned.length > 0) {
        if (cleaned.length <= 2) {
          formatted = `(${cleaned}`;
        } else if (cleaned.length <= 7) {
          formatted = `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
        } else if (cleaned.length <= 11) {
          formatted = `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
        } else {
          formatted = `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
        }
      }
      setFormData(prev => ({
        ...prev,
        [name]: formatted
      }));
      if (telefoneTouched) {
        validarTelefone(formatted);
      }
      return;
    }
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  const validarFormatoEmail = email => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };
  const verificarEmailExistente = async email => {
    try {
      const {
        data,
        error
      } = await supabase.from('profiles').select('email').eq('email', email).maybeSingle();
      if (error) throw error;
      return data !== null;
    } catch (error) {
      console.error('Erro ao verificar email:', error);
      return false;
    }
  };
  const validarEmail = async email => {
    if (!email) {
      setEmailError('');
      return true;
    }
    if (!validarFormatoEmail(email)) {
      setEmailError(t('validation.emailInvalid').toLowerCase());
      return false;
    }
    const emailExiste = await verificarEmailExistente(email);
    if (emailExiste) {
      setEmailError('email já em uso');
      return false;
    }
    setEmailError('');
    return true;
  };
  const validarTelefone = telefone => {
    if (!telefone) {
      setTelefoneError('');
      return true;
    }
    const cleaned = telefone.replace(/\D/g, '');
    if (cleaned.length !== 11 || cleaned.charAt(2) !== '9') {
      setTelefoneError(t('validation.phoneInvalid').toLowerCase());
      return false;
    }
    setTelefoneError('');
    return true;
  };
  const handleEmailBlur = async () => {
    setEmailTouched(true);
    await validarEmail(formData.email);
  };
  const handleTelefoneBlur = () => {
    setTelefoneTouched(true);
    validarTelefone(formData.telefone);
  };
  const handleToggleEmpresa = empresaId => {
    setEmpresasSelecionadas(prev => {
      if (prev.includes(empresaId)) {
        return prev.filter(id => id !== empresaId);
      } else {
        return [...prev, empresaId];
      }
    });
  };
  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    const {
      data: {
        session: adminSession
      }
    } = await supabase.auth.getSession();
    try {
      if (formData.senha !== formData.confirmarSenha) {
        showError('As senhas não conferem!');
        setLoading(false);
        return;
      }
      if (formData.senha.length < 6) {
        showError('A senha deve ter pelo menos 6 caracteres!');
        setLoading(false);
        return;
      }
      if (empresasSelecionadas.length === 0) {
        showError('Selecione pelo menos uma empresa!');
        setLoading(false);
        return;
      }
      const emailValido = await validarEmail(formData.email);
      if (!emailValido) {
        showError('Corrija os erros no formulário antes de continuar');
        setLoading(false);
        return;
      }
      if (formData.telefone) {
        const telefoneValido = validarTelefone(formData.telefone);
        if (!telefoneValido) {
          showError('Corrija os erros no formulário antes de continuar');
          setLoading(false);
          return;
        }
      }
      const {
        data: authData,
        error: authError
      } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.senha,
        options: {
          data: {
            nome: formData.nome
          },
          emailRedirectTo: null
        }
      });
      if (authError) {
        if (authError.message.includes('already registered') || authError.message.includes('duplicate') || authError.message.includes('unique constraint')) {
          throw new Error('Email já cadastrado no sistema');
        }
        throw authError;
      }
      if (!authData.user) {
        throw new Error('Erro ao criar usuário no sistema de autenticação');
      }
      const newUserId = authData.user.id;
      const newUserEmail = authData.user.email;
      await supabase.auth.signOut();
      if (adminSession) {
        await supabase.auth.setSession({
          access_token: adminSession.access_token,
          refresh_token: adminSession.refresh_token
        });
      }
      const profileData = {
        id: newUserId,
        email: newUserEmail,
        nome: formData.nome,
        telefone: formData.telefone || null,
        departamento: formData.departamento || null,
        carga_horaria: parseInt(formData.carga_horaria),
        role: formData.acesso,
        is_active: true,
        superior_empresa_id: superiorEmpresaId
      };
      const {
        data: profileResult,
        error: profileError
      } = await supabase.from('profiles').upsert(profileData, {
        onConflict: 'id',
        ignoreDuplicates: false
      }).select();
      if (profileError) {
        throw new Error(`Erro ao criar perfil: ${profileError.message}`);
      }
      const vinculos = empresasSelecionadas.map(empresaId => ({
        user_id: newUserId,
        empresa_id: empresaId
      }));
      const {
        error: vinculoError
      } = await supabase.from('user_empresas').insert(vinculos);
      if (vinculoError) {
        throw vinculoError;
      }
      showSuccess('Usuário cadastrado com sucesso');
      setTimeout(() => navigate('/painel-admin'), 400);
    } catch (error) {
      let errorMessage = 'Erro ao cadastrar usuário, contate o suporte';
      if (error.message === 'Email já cadastrado no sistema') {
        errorMessage = 'Este email já está cadastrado no sistema';
      } else if (error.message.includes('duplicate key') && error.message.includes('profiles_email')) {
        errorMessage = 'Este email já está cadastrado no sistema';
      } else if (error.message.includes('User already registered')) {
        errorMessage = 'Este email já está cadastrado no sistema';
      } else if (error.message.includes('policies') || error.message.includes('policy') || error.message.includes('row level security') || error.message.includes('RLS')) {
        errorMessage = 'Erro ao cadastrar usuário, contate o suporte';
      } else if (error.message.includes('trigger')) {
        errorMessage = 'Erro ao cadastrar usuário, contate o suporte';
      } else if (error.message.includes('profiles_id_fkey')) {
        errorMessage = 'Erro ao cadastrar usuário, contate o suporte';
      } else if (error.message.includes('user_empresas')) {
        errorMessage = 'Erro ao vincular usuário às empresas';
      } else if (error.message.includes('duplicate key') && error.message.includes('profiles_pkey')) {
        errorMessage = 'Este usuário já foi cadastrado anteriormente';
      }
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  return <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-3 px-3">
      <div className="max-w-3xl mx-auto">
        <div className="yt-card shadow-md p-4">
          <h1 className="text-xl font-bold text-center text-gray-800 dark:text-gray-100 mb-4 flex items-center justify-center gap-2">
            <FiUser className="w-5 h-5" />
            {t('employeeForm.title')}
          </h1>
          
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
              <h2 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2 flex items-center gap-2">
                <FiUser className="w-4 h-4" />
                {t('employeeForm.personalInfo')}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium yt-label mb-1">
                    {t('employeeForm.fullName')}
                  </label>
                  <div className="relative">
                    <FiUser className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                    <input type="text" name="nome" value={formData.nome} onChange={handleChange} required className="w-full pl-8 pr-2 py-1.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs yt-field" placeholder={t('employeeForm.fullNamePlaceholder')} />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium yt-label mb-1">
                    {t('employeeForm.email')}
                  </label>
                  <div className="relative">
                    <FiMail className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                    <input type="email" name="email" value={formData.email} onChange={handleChange} onBlur={handleEmailBlur} required className={`w-full pl-8 pr-2 py-1.5 border rounded-md focus:outline-none focus:ring-2 text-xs yt-field ${emailError ? '!border-red-500 focus:ring-red-500' : ''}`} placeholder={t('employeeForm.emailPlaceholder')} />
                  </div>
                  {emailError && <p className="text-xs text-red-600 mt-1">{emailError}</p>}
                </div>

                <div>
                  <label className="block text-xs font-medium yt-label mb-1">
                    {t('employeeForm.phone')}
                  </label>
                  <div className="relative">
                    <FiPhone className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                    <input type="tel" name="telefone" value={formData.telefone} onChange={handleChange} onBlur={handleTelefoneBlur} className={`w-full pl-8 pr-2 py-1.5 border rounded-md focus:outline-none focus:ring-2 text-xs yt-field ${telefoneError ? '!border-red-500 focus:ring-red-500' : ''}`} placeholder={t('employeeForm.phonePlaceholder')} maxLength="15" />
                  </div>
                  {telefoneError && <p className="text-xs text-red-600 mt-1">{telefoneError}</p>}
                </div>
              </div>
            </div>

            <div className="bg-green-50 dark:bg-green-950/25 p-3 rounded-lg border border-green-200 dark:border-green-800">
              <h2 className="text-sm font-semibold text-green-800 dark:text-green-200 mb-2 flex items-center gap-2">
                <FiBriefcase className="w-4 h-4" />
                {t('employeeForm.professionalInfo')}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium yt-label mb-1">
                    {t('employeeForm.companies')} <span className="text-red-500">*</span>
                  </label>
                  <div className="yt-inset border border-gray-300 dark:border-gray-600 rounded-md p-2 max-h-32 overflow-y-auto">
                    {empresas.length === 0 ? <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-3">
                        {t('employeeForm.noCompaniesMessage')}
                      </p> : <div className="space-y-1.5">
                        {empresas.map(empresa => <label key={empresa.id} className="flex items-center gap-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-800/80 rounded cursor-pointer transition-colors">
                            <input type="checkbox" checked={empresasSelecionadas.includes(empresa.id)} onChange={() => handleToggleEmpresa(empresa.id)} className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 bg-white dark:bg-gray-800" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{empresa.nome}</p>
                              {empresa.cnpj && <p className="text-xs text-gray-500 dark:text-gray-400">CNPJ: {empresa.cnpj}</p>}
                            </div>
                            {empresasSelecionadas.includes(empresa.id) && <FiCheck className="w-4 h-4 text-green-600" />}
                          </label>)}
                      </div>}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {empresasSelecionadas.length === 0 ? t('employeeForm.selectCompanies') : `${empresasSelecionadas.length} ${t('employeeForm.companies').toLowerCase()} ${empresasSelecionadas.length === 1 ? 'selecionada' : 'selecionadas'}`}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium yt-label mb-1">
                    {t('employeeForm.department')}
                  </label>
                  <select name="departamento" value={formData.departamento} onChange={handleChange} className="w-full px-2 py-1.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs yt-field">
                    <option value="">{t('employeeForm.selectDepartment')}</option>
                    <option value="Tecnologia">Tecnologia</option>
                    <option value="Recursos Humanos">Recursos Humanos</option>
                    <option value="Financeiro">Financeiro</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Vendas">Vendas</option>
                    <option value="Operações">Operações</option>
                    <option value="Gestão">Gestão</option>
                    <option value="Design">Design</option>
                    <option value="Suporte">Suporte</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium yt-label mb-1">
                    {t('employeeForm.weeklyHours')}
                  </label>
                  <div className="relative">
                    <FiClock className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                    <input type="number" name="carga_horaria" value={formData.carga_horaria} onChange={handleChange} min="20" max="60" required className="w-full pl-8 pr-2 py-1.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs yt-field" placeholder="40" />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Horas/semana (padrão: 40h)</p>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-950/25 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <h2 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-2 flex items-center gap-2">
                <FiLock className="w-4 h-4" />
                {t('employeeForm.accessInfo')}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium yt-label mb-1">
                    {t('employeeForm.accessLevel')} <span className="text-red-500">*</span>
                  </label>
                  <select name="acesso" value={formData.acesso} onChange={handleChange} required className="w-full px-2 py-1.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs yt-field">
                    <option value="user">{t('employeeForm.user')}</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium yt-label mb-1">
                    {t('employeeForm.password')} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <FiLock className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                    <input type="password" name="senha" value={formData.senha} onChange={handleChange} required minLength={6} className="w-full pl-8 pr-2 py-1.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs yt-field" placeholder={t('employeeForm.minCharacters')} />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium yt-label mb-1">
                    {t('employeeForm.confirmPassword')} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <FiLock className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                    <input type="password" name="confirmarSenha" value={formData.confirmarSenha} onChange={handleChange} required className="w-full pl-8 pr-2 py-1.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs yt-field" placeholder={t('employeeForm.confirmPasswordPlaceholder')} />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Link to="/painel-admin" className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-3 rounded-md transition-colors flex items-center justify-center gap-2 text-xs">
                <FiArrowLeft className="w-3.5 h-3.5" />
                {t('employeeForm.backToPanel')}
              </Link>
              
              <button type="submit" disabled={loading} className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 text-white font-bold py-2 px-3 rounded-md transition-colors flex items-center justify-center gap-2 text-xs">
                {loading ? <>
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>
                    {t('common.loading')}...
                  </> : <>
                    <FiCheck className="w-3.5 h-3.5" />
                    {t('employeeForm.registerEmployee')}
                  </>}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>;
}
export default CadastroUser;
