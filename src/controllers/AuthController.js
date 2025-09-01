// AuthController.js
// Controller responsável por gerenciar autenticação de usuários

class AuthController {
  
  // Credenciais válidas para teste - em produção vira de uma API
  static validCredentials = [
    { email: 'admin@yourtime.com', senha: '123456', role: 'admin' },
    { email: 'jose@empresa.com', senha: 'senha123', role: 'user' },
    { email: 'teste@teste.com', senha: '123456', role: 'user' }
  ]

  /**
   * Valida as credenciais do usuário
   * @param {string} email - Email do usuário
   * @param {string} senha - Senha do usuário
   * @returns {Object} - Resultado da validação
   */
  static validateCredentials(email, senha) {
    if (!email || !senha) {
      return {
        success: false,
        message: 'Email e senha são obrigatórios'
      }
    }

    const user = this.validCredentials.find(
      cred => cred.email === email && cred.senha === senha
    )

    if (user) {
      return {
        success: true,
        message: 'Login realizado com sucesso!',
        user: {
          email: user.email,
          role: user.role
        }
      }
    }

    return {
      success: false,
      message: 'Email ou senha inválidos!',
      suggestions: 'Credenciais de teste:\n• admin@yourtime.com / 123456\n• jose@empresa.com / senha123\n• teste@teste.com / 123456'
    }
  }

  /**
   * Realiza o processo de login
   * @param {string} email - Email do usuário
   * @param {string} senha - Senha do usuário
   * @param {Function} navigate - Função de navegação do React Router
   * @returns {Object} - Resultado do login
   */
  static async login(email, senha, navigate) {
    try {
      const result = this.validateCredentials(email, senha)
      
      if (result.success) {
        // Salvar dados do usuário no localStorage (simulação)
        localStorage.setItem('user', JSON.stringify(result.user))
        localStorage.setItem('isAuthenticated', 'true')
        
        // Redirecionar para dashboard
        navigate('/')
        
        return result
      }
      
      return result
    } catch (error) {
      return {
        success: false,
        message: 'Erro interno do sistema',
        error: error.message
      }
    }
  }

  /**
   * Realiza logout do usuário
   * @param {Function} navigate - Função de navegação do React Router
   */
  static logout(navigate) {
    localStorage.removeItem('user')
    localStorage.removeItem('isAuthenticated')
    navigate('/login')
  }

  /**
   * Verifica se o usuário está autenticado
   * @returns {boolean} - True se autenticado
   */
  static isAuthenticated() {
    return localStorage.getItem('isAuthenticated') === 'true'
  }

  /**
   * Obtém dados do usuário logado
   * @returns {Object|null} - Dados do usuário ou null
   */
  static getCurrentUser() {
    try {
      const user = localStorage.getItem('user')
      return user ? JSON.parse(user) : null
    } catch {
      return null
    }
  }
}

export default AuthController
