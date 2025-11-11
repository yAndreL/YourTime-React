import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../config/supabase.js'
import { useToast } from '../../hooks/useToast'
import { FiUser, FiMail, FiPhone, FiBriefcase, FiCalendar, FiClock, FiLock, FiCheck, FiArrowLeft } from 'react-icons/fi'

function CadastroUser() {
  const { showSuccess, showError } = useToast()
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    acesso: 'user',
    departamento: '',
    carga_horaria: 40,
    senha: '',
    confirmarSenha: ''
  })
  const [loading, setLoading] = useState(false)
  const [empresas, setEmpresas] = useState([])
  const [empresasSelecionadas, setEmpresasSelecionadas] = useState([])
  const [superiorEmpresaId, setSuperiorEmpresaId] = useState(null)
  const [emailError, setEmailError] = useState('')
  const [telefoneError, setTelefoneError] = useState('')
  const [emailTouched, setEmailTouched] = useState(false)
  const [telefoneTouched, setTelefoneTouched] = useState(false)
  const navigate = useNavigate()

  // Carregar empresas do banco de dados (filtradas por superior_empresa_id)
  useEffect(() => {
    const carregarEmpresas = async () => {
      try {
        // Buscar superior_empresa_id do usuário logado
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: profile } = await supabase
          .from('profiles')
          .select('superior_empresa_id')
          .eq('id', user.id)
          .single()

        const empresaIdFiltro = profile?.superior_empresa_id

        if (!empresaIdFiltro) {
          console.warn('Usuário sem superior_empresa_id configurado')
          return
        }

        setSuperiorEmpresaId(empresaIdFiltro)

        // Carregar empresas: mostra a empresa principal + empresas filhas
        const { data, error } = await supabase
          .from('empresas')
          .select('id, nome, cnpj')
          .eq('is_active', true)
          .or(`id.eq.${empresaIdFiltro},superior_empresa_id.eq.${empresaIdFiltro}`)
          .order('nome')
        
        if (!error && data) {
          setEmpresas(data)
        }
      } catch (error) {
        console.error('Erro ao carregar empresas:', error)
      }
    }

    carregarEmpresas()
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    
    // Formatação especial para telefone
    if (name === 'telefone') {
      const cleaned = value.replace(/\D/g, '')
      let formatted = cleaned
      
      if (cleaned.length > 0) {
        if (cleaned.length <= 2) {
          formatted = `(${cleaned}`
        } else if (cleaned.length <= 7) {
          formatted = `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`
        } else if (cleaned.length <= 11) {
          formatted = `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`
        } else {
          formatted = `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`
        }
      }
      
      setFormData(prev => ({
        ...prev,
        [name]: formatted
      }))
      
      // Validar telefone ao digitar (se campo foi tocado)
      if (telefoneTouched) {
        validarTelefone(formatted)
      }
      return
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // Validar formato de email
  const validarFormatoEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  // Verificar se email já existe no banco
  const verificarEmailExistente = async (email) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', email)
        .maybeSingle()
      
      if (error) throw error
      return data !== null
    } catch (error) {
      console.error('Erro ao verificar email:', error)
      return false
    }
  }

  // Validar email completo
  const validarEmail = async (email) => {
    if (!email) {
      setEmailError('')
      return true
    }

    if (!validarFormatoEmail(email)) {
      setEmailError('email inválido')
      return false
    }

    const emailExiste = await verificarEmailExistente(email)
    if (emailExiste) {
      setEmailError('email já em uso')
      return false
    }

    setEmailError('')
    return true
  }

  // Validar telefone
  const validarTelefone = (telefone) => {
    if (!telefone) {
      setTelefoneError('')
      return true
    }

    const cleaned = telefone.replace(/\D/g, '')
    
    // Telefone deve ter 11 dígitos e o terceiro dígito deve ser 9
    if (cleaned.length !== 11 || cleaned.charAt(2) !== '9') {
      setTelefoneError('telefone inválido')
      return false
    }

    setTelefoneError('')
    return true
  }

  // Handler para quando o campo de email perde o foco
  const handleEmailBlur = async () => {
    setEmailTouched(true)
    await validarEmail(formData.email)
  }

  // Handler para quando o campo de telefone perde o foco
  const handleTelefoneBlur = () => {
    setTelefoneTouched(true)
    validarTelefone(formData.telefone)
  }

  const handleToggleEmpresa = (empresaId) => {
    setEmpresasSelecionadas(prev => {
      if (prev.includes(empresaId)) {
        return prev.filter(id => id !== empresaId)
      } else {
        return [...prev, empresaId]
      }
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    // Salvar sessão do admin antes de criar o novo usuário
    const { data: { session: adminSession } } = await supabase.auth.getSession()
    
    try {
      // Validações
      if (formData.senha !== formData.confirmarSenha) {
        showError('As senhas não conferem!')
        setLoading(false)
        return
      }

      if (formData.senha.length < 6) {
        showError('A senha deve ter pelo menos 6 caracteres!')
        setLoading(false)
        return
      }

      // Validar seleção de empresas
      if (empresasSelecionadas.length === 0) {
        showError('Selecione pelo menos uma empresa!')
        setLoading(false)
        return
      }

      // Validar email antes de submeter
      const emailValido = await validarEmail(formData.email)
      if (!emailValido) {
        showError('Corrija os erros no formulário antes de continuar')
        setLoading(false)
        return
      }

      // Validar telefone se preenchido
      if (formData.telefone) {
        const telefoneValido = validarTelefone(formData.telefone)
        if (!telefoneValido) {
          showError('Corrija os erros no formulário antes de continuar')
          setLoading(false)
          return
        }
      }

      // 1. Criar usuário no Supabase Auth com confirmação automática
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.senha,
        options: {
          data: {
            nome: formData.nome
          },
          emailRedirectTo: null // Sem redirect de confirmação
        }
      })

      if (authError) {
        // Verificar se é erro de email duplicado
        if (authError.message.includes('already registered') || 
            authError.message.includes('duplicate') ||
            authError.message.includes('unique constraint')) {
          throw new Error('Email já cadastrado no sistema')
        }
        throw authError
      }

      // Verificar se o usuário foi criado
      if (!authData.user) {
        throw new Error('Erro ao criar usuário no sistema de autenticação')
      }

      // IMPORTANTE: Salvar o ID do novo usuário ANTES de fazer logout
      const newUserId = authData.user.id
      const newUserEmail = authData.user.email

      // IMPORTANTE: Fazer logout do novo usuário e restaurar sessão do admin
      await supabase.auth.signOut()
      
      if (adminSession) {
        await supabase.auth.setSession({
          access_token: adminSession.access_token,
          refresh_token: adminSession.refresh_token
        })

      }

      // 3. CRIAR OU ATUALIZAR O PROFILE (UPSERT)
      // Agora com a sessão do admin restaurada

      const profileData = {
        id: newUserId, // Usando ID salvo
        email: newUserEmail,
        nome: formData.nome,
        telefone: formData.telefone || null,
        departamento: formData.departamento || null,
        carga_horaria: parseInt(formData.carga_horaria),
        role: formData.acesso, // 'admin' ou 'user'
        is_active: true,
        superior_empresa_id: superiorEmpresaId // ✅ Vincular à mesma empresa do admin
      }

      // Usar UPSERT para criar ou atualizar
      const { data: profileResult, error: profileError } = await supabase
        .from('profiles')
        .upsert(profileData, {
          onConflict: 'id', // Se o ID já existir, faz UPDATE
          ignoreDuplicates: false
        })
        .select()

      if (profileError) {

        throw new Error(`Erro ao criar perfil: ${profileError.message}`)
      }

      // 4. Vincular funcionário às empresas selecionadas

      const vinculos = empresasSelecionadas.map(empresaId => ({
        user_id: newUserId, // Usando ID salvo
        empresa_id: empresaId
      }))

      const { error: vinculoError } = await supabase
        .from('user_empresas')
        .insert(vinculos)

      if (vinculoError) {

        throw vinculoError
      }

      showSuccess('Usuário cadastrado com sucesso')
      setTimeout(() => navigate('/painel-admin'), 1500)
    } catch (error) {

      let errorMessage = 'Erro ao cadastrar usuário, contate o suporte'
      
      // Mensagens de erro específicas e amigáveis
      if (error.message === 'Email já cadastrado no sistema') {
        errorMessage = 'Este email já está cadastrado no sistema'
      } else if (error.message.includes('duplicate key') && error.message.includes('profiles_email')) {
        errorMessage = 'Este email já está cadastrado no sistema'
      } else if (error.message.includes('User already registered')) {
        errorMessage = 'Este email já está cadastrado no sistema'
      } else if (error.message.includes('policies') || 
                 error.message.includes('policy') || 
                 error.message.includes('row level security') ||
                 error.message.includes('RLS')) {
        errorMessage = 'Erro ao cadastrar usuário, contate o suporte'
      } else if (error.message.includes('trigger')) {
        errorMessage = 'Erro ao cadastrar usuário, contate o suporte'
      } else if (error.message.includes('profiles_id_fkey')) {
        errorMessage = 'Erro ao cadastrar usuário, contate o suporte'
      } else if (error.message.includes('user_empresas')) {
        errorMessage = 'Erro ao vincular usuário às empresas'
      } else if (error.message.includes('duplicate key') && error.message.includes('profiles_pkey')) {
        errorMessage = 'Este usuário já foi cadastrado anteriormente'
      }
      
      showError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-center text-gray-800 mb-6 flex items-center justify-center gap-2">
            <FiUser className="w-6 h-6" />
            Cadastro de Funcionário
          </h1>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Informações Pessoais */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h2 className="text-base font-semibold text-blue-800 mb-3 flex items-center gap-2">
                <FiUser className="w-4 h-4" />
                Informações Pessoais
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome Completo
                  </label>
                  <div className="relative">
                    <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input 
                      type="text"
                      name="nome"
                      value={formData.nome}
                      onChange={handleChange}
                      required
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="Nome completo do funcionário"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <div className="relative">
                    <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input 
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      onBlur={handleEmailBlur}
                      required
                      className={`w-full pl-9 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 text-sm ${
                        emailError 
                          ? 'border-red-500 focus:ring-red-500' 
                          : 'border-gray-300 focus:ring-blue-500'
                      }`}
                      placeholder="funcionario@empresa.com"
                    />
                  </div>
                  {emailError && (
                    <p className="text-xs text-red-600 mt-1">{emailError}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefone
                  </label>
                  <div className="relative">
                    <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input 
                      type="tel"
                      name="telefone"
                      value={formData.telefone}
                      onChange={handleChange}
                      onBlur={handleTelefoneBlur}
                      className={`w-full pl-9 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 text-sm ${
                        telefoneError 
                          ? 'border-red-500 focus:ring-red-500' 
                          : 'border-gray-300 focus:ring-blue-500'
                      }`}
                      placeholder="(11) 99999-9999"
                      maxLength="15"
                    />
                  </div>
                  {telefoneError && (
                    <p className="text-xs text-red-600 mt-1">{telefoneError}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Informações Profissionais */}
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h2 className="text-base font-semibold text-green-800 mb-3 flex items-center gap-2">
                <FiBriefcase className="w-4 h-4" />
                Informações Profissionais
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Empresas <span className="text-red-500">*</span>
                  </label>
                  <div className="bg-white border border-gray-300 rounded-md p-3 max-h-40 overflow-y-auto">
                    {empresas.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-3">
                        Nenhuma empresa cadastrada. Cadastre empresas primeiro na aba "Empresas" do Painel Admin.
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        {empresas.map((empresa) => (
                          <label
                            key={empresa.id}
                            className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={empresasSelecionadas.includes(empresa.id)}
                              onChange={() => handleToggleEmpresa(empresa.id)}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">{empresa.nome}</p>
                              {empresa.cnpj && (
                                <p className="text-xs text-gray-500">CNPJ: {empresa.cnpj}</p>
                              )}
                            </div>
                            {empresasSelecionadas.includes(empresa.id) && (
                              <FiCheck className="w-4 h-4 text-green-600" />
                            )}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1.5">
                    {empresasSelecionadas.length === 0 
                      ? 'Selecione uma ou mais empresas para vincular este funcionário'
                      : `${empresasSelecionadas.length} empresa(s) selecionada(s)`}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Departamento (opcional)
                  </label>
                  <select
                    name="departamento"
                    value={formData.departamento}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="">Selecione o departamento</option>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Carga Horária Semanal
                  </label>
                  <div className="relative">
                    <FiClock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input 
                      type="number"
                      name="carga_horaria"
                      value={formData.carga_horaria}
                      onChange={handleChange}
                      min="20"
                      max="60"
                      required
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="40"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Horas/semana (padrão: 40h)</p>
                </div>
              </div>
            </div>

            {/* Informações de Acesso */}
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <h2 className="text-base font-semibold text-yellow-800 mb-3 flex items-center gap-2">
                <FiLock className="w-4 h-4" />
                Informações de Acesso
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nível de Acesso <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="acesso"
                    value={formData.acesso}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="user">Usuário</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Senha <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input 
                      type="password"
                      name="senha"
                      value={formData.senha}
                      onChange={handleChange}
                      required
                      minLength={6}
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="Mínimo 6 caracteres"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirmar Senha <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input 
                      type="password"
                      name="confirmarSenha"
                      value={formData.confirmarSenha}
                      onChange={handleChange}
                      required
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="Confirme a senha"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link 
                to="/painel-admin"
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-2.5 px-4 rounded-md transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <FiArrowLeft className="w-4 h-4" />
                Voltar ao Painel
              </Link>
              
              <button 
                type="submit"
                disabled={loading}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-2.5 px-4 rounded-md transition-colors flex items-center justify-center gap-2 text-sm"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Cadastrando...
                  </>
                ) : (
                  <>
                    <FiCheck className="w-4 h-4" />
                    Cadastrar Funcionário
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default CadastroUser
