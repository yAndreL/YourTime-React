// User.js
// Model para representar usuários no sistema

class User {
  constructor(data = {}) {
    this.id = data.id || null
    this.email = data.email || ''
    this.senha = data.senha || ''
    this.nome = data.nome || ''
    this.role = data.role || 'user'
    this.isActive = data.isActive !== undefined ? data.isActive : true
    this.createdAt = data.createdAt || new Date().toISOString()
    this.updatedAt = data.updatedAt || new Date().toISOString()
  }

  /**
   * Valida os dados do usuário
   * @returns {Object} - Resultado da validação
   */
  validate() {
    const errors = []

    // Validar email
    if (!this.email) {
      errors.push('Email é obrigatório')
    } else if (!this.isValidEmail(this.email)) {
      errors.push('Formato de email inválido')
    }

    // Validar senha
    if (!this.senha) {
      errors.push('Senha é obrigatória')
    } else if (this.senha.length < 6) {
      errors.push('Senha deve ter pelo menos 6 caracteres')
    }

    // Validar nome
    if (!this.nome) {
      errors.push('Nome é obrigatório')
    } else if (this.nome.length < 2) {
      errors.push('Nome deve ter pelo menos 2 caracteres')
    }

    // Validar role
    const validRoles = ['admin', 'user', 'manager']
    if (!validRoles.includes(this.role)) {
      errors.push('Tipo de usuário inválido')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Valida formato de email
   * @param {string} email - Email a ser validado
   * @returns {boolean} - True se válido
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  /**
   * Converte para objeto simples (para JSON)
   * @returns {Object} - Dados do usuário
   */
  toJSON() {
    return {
      id: this.id,
      email: this.email,
      nome: this.nome,
      role: this.role,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    }
  }

  /**
   * Converte para objeto seguro (sem senha)
   * @returns {Object} - Dados seguros do usuário
   */
  toSafeJSON() {
    const safe = this.toJSON()
    delete safe.senha
    return safe
  }

  /**
   * Atualiza timestamp de modificação
   */
  touch() {
    this.updatedAt = new Date().toISOString()
  }

  /**
   * Cria instância a partir de dados externos
   * @param {Object} data - Dados do usuário
   * @returns {User} - Nova instância
   */
  static fromJSON(data) {
    return new User(data)
  }

  /**
   * Verifica se o usuário tem uma role específica
   * @param {string} role - Role a verificar
   * @returns {boolean} - True se tem a role
   */
  hasRole(role) {
    return this.role === role
  }

  /**
   * Verifica se é admin
   * @returns {boolean} - True se é admin
   */
  isAdmin() {
    return this.hasRole('admin')
  }

  /**
   * Verifica se é manager
   * @returns {boolean} - True se é manager
   */
  isManager() {
    return this.hasRole('manager')
  }
}

export default User
