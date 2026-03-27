import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../config/supabase.js';
import { useToast } from '../../hooks/useToast';
import { useLanguage } from '../../hooks/useLanguage';
import { FiUser, FiMail, FiPhone, FiBriefcase, FiClock, FiLock, FiCheck, FiArrowLeft } from 'react-icons/fi';

function textoErroCadastro(error, t) {
  const msg = error?.message || error?.details || String(error);
  const lower = msg.toLowerCase();
  if (
    /already registered|already been registered|user already registered|email.*registered|duplicate key.*users|users_email/i.test(
      msg
    )
  ) {
    return t('employeeForm.errorOrphanedEmail');
  }
  if (/profiles_email|duplicate key.*profiles.*email/i.test(lower)) {
    return t('employeeForm.errorEmailInUse');
  }
  if (
    /row level security|violates row-level security|\brls\b|42501|new row violates|policy|42p17|infinite recursion/i.test(lower)
  ) {
    return t('employeeForm.errorRlsPermission');
  }
  if (/erro ao criar perfil/i.test(msg)) {
    return t('employeeForm.errorRlsPermission');
  }
  if (/user_empresas/i.test(lower) && (/violat|policy|rls|permission|recursion/i.test(lower) || /duplicate/i.test(lower))) {
    return t('employeeForm.errorCompanyLink');
  }
  if (/erro ao vincular empresas/i.test(msg)) {
    return t('employeeForm.errorCompanyLink');
  }
  if (import.meta.env.DEV) {
    console.error('[Cadastro]', error);
    return msg.length > 500 ? `${msg.slice(0, 500)}…` : msg;
  }
  return t('employeeForm.errorGeneric');
}

function CadastroUser() {
  const { t } = useLanguage();
  const { showSuccess, showError } = useToast();
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    acesso: 'user',
    departamento: '',
    carga_horaria: 40,
    hora_entrada: '09:00',
    hora_saida: '18:00',
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
          data: { user }
        } = await supabase.auth.getUser();
        if (!user) return;
        const { data: profile } = await supabase.from('profiles').select('superior_empresa_id').eq('id', user.id).single();
        const empresaIdFiltro = profile?.superior_empresa_id;
        if (!empresaIdFiltro) {
          return;
        }
        setSuperiorEmpresaId(empresaIdFiltro);
        const { data, error } = await supabase
          .from('empresas')
          .select('id, nome, cnpj')
          .eq('is_active', true)
          .or(`id.eq.${empresaIdFiltro},superior_empresa_id.eq.${empresaIdFiltro}`)
          .order('nome');
        if (!error && data) {
          setEmpresas(data);
        }
      } catch {
        /* ignore */
      }
    };
    carregarEmpresas();
  }, []);

  const handleChange = e => {
    const { name, value } = e.target;
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
      setFormData(prev => ({ ...prev, [name]: formatted }));
      if (telefoneTouched) {
        validarTelefone(formatted);
      }
      return;
    }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validarFormatoEmail = email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const verificarEmailExistente = async email => {
    try {
      const { data, error } = await supabase.from('profiles').select('email').eq('email', email).maybeSingle();
      if (error) throw error;
      return data !== null;
    } catch (e) {
      console.error('Erro ao verificar email:', e);
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
      setEmailError('E-mail já em uso');
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
    setEmpresasSelecionadas(prev =>
      prev.includes(empresaId) ? prev.filter(id => id !== empresaId) : [...prev, empresaId]
    );
  };

  const legendaEmpresasSelecionadas = () => {
    const n = empresasSelecionadas.length;
    if (n === 0) return t('employeeForm.selectCompanies');
    if (n === 1) return t('employeeForm.companiesSelectedOne');
    return t('employeeForm.companiesSelectedMany').replace('{{count}}', String(n));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    const {
      data: { session: adminSession }
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

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email.trim().toLowerCase(),
        password: formData.senha,
        options: {
          data: {
            nome: formData.nome
          }
        }
      });

      if (authError) {
        if (
          authError.message.includes('already registered') ||
          authError.message.includes('duplicate') ||
          authError.message.includes('unique constraint')
        ) {
          throw new Error(t('employeeForm.errorOrphanedEmail'));
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

      const roleDb = formData.acesso === 'admin' ? 'admin' : 'usuario';

      const profileData = {
        id: newUserId,
        email: newUserEmail,
        nome: formData.nome,
        telefone: formData.telefone || null,
        departamento: formData.departamento || null,
        carga_horaria: parseInt(formData.carga_horaria, 10),
        hora_entrada: `${formData.hora_entrada}:00`,
        hora_saida: `${formData.hora_saida}:00`,
        role: roleDb,
        is_active: true,
        superior_empresa_id: superiorEmpresaId
      };

      const { error: profileError } = await supabase.from('profiles').upsert(profileData, {
        onConflict: 'id',
        ignoreDuplicates: false
      });

      if (profileError) {
        if (import.meta.env.DEV) {
          console.error('[Cadastro] profiles:', profileError);
        }
        throw new Error(`Erro ao criar perfil: ${profileError.message}`);
      }

      const vinculos = empresasSelecionadas.map(empresaId => ({
        user_id: newUserId,
        empresa_id: empresaId
      }));
      const { error: vinculoError } = await supabase.from('user_empresas').insert(vinculos);
      if (vinculoError) {
        if (import.meta.env.DEV) {
          console.error('[Cadastro] user_empresas:', vinculoError);
        }
        throw new Error(`Erro ao vincular empresas: ${vinculoError.message}`);
      }

      let successText = t('employeeForm.registerSuccess');
      if (!authData.session) {
        successText += `. ${t('employeeForm.confirmEmailNotice')}`;
      }
      showSuccess(successText);
      setTimeout(() => navigate('/painel-admin'), 500);
    } catch (error) {
      showError(textoErroCadastro(error, t));
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full pl-8 pr-2 py-1.5 border rounded-md text-sm yt-field focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow';
  const labelClass = 'block text-xs font-medium yt-label mb-1';
  const secTitle =
    'text-[11px] font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400 flex items-center gap-1.5 mb-2';

  return (
    <div className="min-h-[100dvh] flex flex-col bg-gray-50 dark:bg-gray-950 px-3 py-4 sm:px-4 sm:py-6">
      <div className="m-auto w-full max-w-5xl">
        <div className="yt-card shadow-md border border-gray-200 dark:border-gray-800 overflow-hidden rounded-xl">
          <div className="px-4 py-2.5 sm:px-5 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <h1 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                <FiUser className="w-4 h-4" />
              </span>
              {t('employeeForm.title')}
            </h1>
          </div>

          <form
            onSubmit={handleSubmit}
            className="bg-white dark:bg-gray-950/40"
          >
            <div className="px-4 py-3 sm:px-5 grid gap-3 lg:grid-cols-2 lg:grid-rows-[auto_1fr] lg:gap-x-6 lg:items-stretch">
              <section className="pb-3 border-b border-gray-200 dark:border-gray-800 lg:col-start-1 lg:row-start-1 lg:border-b-0 lg:pb-0">
                <h2 className={secTitle}>
                  <FiUser className="w-3.5 h-3.5" />
                  {t('employeeForm.personalInfo')}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                  <div className="sm:col-span-2">
                    <label className={labelClass}>{t('employeeForm.fullName')}</label>
                    <div className="relative">
                      <FiUser className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5 pointer-events-none" />
                      <input
                        type="text"
                        name="nome"
                        value={formData.nome}
                        onChange={handleChange}
                        required
                        className={inputClass}
                        placeholder={t('employeeForm.fullNamePlaceholder')}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>{t('employeeForm.email')}</label>
                    <div className="relative">
                      <FiMail className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5 pointer-events-none" />
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        onBlur={handleEmailBlur}
                        required
                        className={`${inputClass} ${emailError ? '!border-red-500 focus:ring-red-500' : ''}`}
                        placeholder={t('employeeForm.emailPlaceholder')}
                      />
                    </div>
                    {emailError && <p className="text-[11px] text-red-600 dark:text-red-400 mt-0.5">{emailError}</p>}
                  </div>
                  <div>
                    <label className={labelClass}>{t('employeeForm.phone')}</label>
                    <div className="relative">
                      <FiPhone className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5 pointer-events-none" />
                      <input
                        type="tel"
                        name="telefone"
                        value={formData.telefone}
                        onChange={handleChange}
                        onBlur={handleTelefoneBlur}
                        className={`${inputClass} ${telefoneError ? '!border-red-500 focus:ring-red-500' : ''}`}
                        placeholder={t('employeeForm.phonePlaceholder')}
                        maxLength={15}
                      />
                    </div>
                    {telefoneError && <p className="text-[11px] text-red-600 dark:text-red-400 mt-0.5">{telefoneError}</p>}
                  </div>
                </div>
              </section>

              <section className="pb-3 border-b border-gray-200 dark:border-gray-800 lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:border-b-0 lg:border-l lg:border-gray-200 lg:dark:border-gray-800 lg:pl-6">
                <h2 className={secTitle}>
                  <FiBriefcase className="w-3.5 h-3.5" />
                  {t('employeeForm.professionalInfo')}
                </h2>
                <div>
                  <label className={labelClass}>
                    {t('employeeForm.companies')} <span className="text-red-500">*</span>
                  </label>
                  <div className="yt-inset border border-gray-200 dark:border-gray-700 rounded-lg p-2 max-h-[7.5rem] sm:max-h-[min(28vh,9rem)] lg:max-h-[min(32vh,11rem)] overflow-y-auto">
                    {empresas.length === 0 ? (
                      <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-2">{t('employeeForm.noCompaniesMessage')}</p>
                    ) : (
                      <ul className="space-y-1">
                        {empresas.map(empresa => (
                          <li key={empresa.id}>
                            <label className="flex items-center gap-2 p-1.5 rounded-md border border-transparent hover:border-gray-200 dark:hover:border-gray-600 hover:bg-white/80 dark:hover:bg-gray-900/40 cursor-pointer transition-colors">
                              <input
                                type="checkbox"
                                checked={empresasSelecionadas.includes(empresa.id)}
                                onChange={() => handleToggleEmpresa(empresa.id)}
                                className="w-3.5 h-3.5 text-blue-600 border-gray-300 dark:border-gray-600 rounded shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-gray-900 dark:text-gray-100 leading-tight">{empresa.nome}</p>
                                {empresa.cnpj && (
                                  <p className="text-[10px] text-gray-500 dark:text-gray-400">CNPJ: {empresa.cnpj}</p>
                                )}
                              </div>
                              {empresasSelecionadas.includes(empresa.id) && (
                                <FiCheck className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" aria-hidden />
                              )}
                            </label>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">{legendaEmpresasSelecionadas()}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:gap-3 mt-2">
                  <div className="col-span-2 sm:col-span-1">
                    <label className={labelClass}>{t('employeeForm.department')}</label>
                    <select name="departamento" value={formData.departamento} onChange={handleChange} className={inputClass}>
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
                  <div className="col-span-2 sm:col-span-1">
                    <label className={labelClass}>
                      {t('employeeForm.weeklyHours')} <span className="text-gray-400 dark:text-gray-500 font-normal">(40)</span>
                    </label>
                    <div className="relative">
                      <FiClock className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5 pointer-events-none" />
                      <input
                        type="number"
                        name="carga_horaria"
                        value={formData.carga_horaria}
                        onChange={handleChange}
                        min={20}
                        max={60}
                        required
                        className={inputClass}
                        placeholder="40"
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>{t('employeeForm.shiftStart')}</label>
                    <div className="relative">
                      <FiClock className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5 pointer-events-none" />
                      <input
                        type="time"
                        name="hora_entrada"
                        value={formData.hora_entrada}
                        onChange={handleChange}
                        required
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>{t('employeeForm.shiftEnd')}</label>
                    <div className="relative">
                      <FiClock className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5 pointer-events-none" />
                      <input
                        type="time"
                        name="hora_saida"
                        value={formData.hora_saida}
                        onChange={handleChange}
                        required
                        className={inputClass}
                      />
                    </div>
                  </div>
                </div>
              </section>

              <section className="lg:col-start-1 lg:row-start-2 lg:pr-4">
                <h2 className={secTitle}>
                  <FiLock className="w-3.5 h-3.5" />
                  {t('employeeForm.accessInfo')}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                  <div className="sm:col-span-3">
                    <label className={labelClass}>
                      {t('employeeForm.accessLevel')} <span className="text-red-500">*</span>
                    </label>
                    <select name="acesso" value={formData.acesso} onChange={handleChange} required className={inputClass}>
                      <option value="user">{t('employeeForm.user')}</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>
                      {t('employeeForm.password')} <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <FiLock className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5 pointer-events-none" />
                      <input
                        type="password"
                        name="senha"
                        value={formData.senha}
                        onChange={handleChange}
                        required
                        minLength={6}
                        className={inputClass}
                        placeholder={t('employeeForm.minCharacters')}
                      />
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>
                      {t('employeeForm.confirmPassword')} <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <FiLock className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5 pointer-events-none" />
                      <input
                        type="password"
                        name="confirmarSenha"
                        value={formData.confirmarSenha}
                        onChange={handleChange}
                        required
                        className={inputClass}
                        placeholder={t('employeeForm.confirmPasswordPlaceholder')}
                      />
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <div className="px-4 py-2.5 sm:px-5 flex flex-col-reverse sm:flex-row gap-2 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/60">
              <Link
                to="/painel-admin"
                className="flex-1 inline-flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-medium text-xs sm:text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <FiArrowLeft className="w-3.5 h-3.5" />
                {t('employeeForm.backToPanel')}
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 inline-flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-xs sm:text-sm transition-colors"
              >
                {loading ? (
                  <>
                    <span className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                    {t('common.loading')}
                  </>
                ) : (
                  <>
                    <FiCheck className="w-3.5 h-3.5" />
                    {t('employeeForm.registerEmployee')}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default CadastroUser;
