/**
 * Serviço de envio de emails
 * 
 * Para configurar:
 * 1. Criar conta no Resend (https://resend.com)
 * 2. Adicionar no .env: VITE_RESEND_API_KEY=sua_chave_aqui
 * 3. Verificar domínio no Resend ou usar domínio de teste
 */

const RESEND_API_KEY = import.meta.env.VITE_RESEND_API_KEY
const RESEND_API_URL = 'https://api.resend.com/emails'

/**
 * Envia email com código de verificação
 */
export const enviarCodigoRecuperacao = async (email, codigo) => {
  try {
    // MODO DESENVOLVIMENTO: Se estiver em localhost, apenas simula o envio
    const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    
    if (isDev) {
      // Simular delay de rede
      await new Promise(resolve => setTimeout(resolve, 500))
      return { success: true, dev: true, codigo }
    }

    // MODO PRODUÇÃO: Envia email real via Resend
    if (!RESEND_API_KEY) {
      throw new Error('Chave API do Resend não configurada')
    }

    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'YourTime <onboarding@resend.dev>',
        to: email,
        subject: 'Código de Recuperação de Senha - YourTime',
        html: gerarHTMLEmail(codigo)
      })
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || 'Erro ao enviar email')
    }

    return { success: true, data }
  } catch (error) {
    throw error
  }
}

/**
 * Gera HTML do email com código de verificação
 */
const gerarHTMLEmail = (codigo) => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Código de Recuperação</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background-color: #f3f4f6;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 40px auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header {
            background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
            padding: 40px 20px;
            text-align: center;
          }
          .header h1 {
            color: #ffffff;
            margin: 0;
            font-size: 28px;
            font-weight: bold;
          }
          .content {
            padding: 40px 30px;
          }
          .content p {
            color: #4b5563;
            font-size: 16px;
            line-height: 1.6;
            margin: 0 0 20px 0;
          }
          .code-box {
            background-color: #f3f4f6;
            border: 2px dashed #d1d5db;
            border-radius: 8px;
            padding: 30px;
            text-align: center;
            margin: 30px 0;
          }
          .code {
            font-size: 48px;
            font-weight: bold;
            color: #1f2937;
            letter-spacing: 8px;
            font-family: 'Courier New', monospace;
          }
          .warning {
            background-color: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px 20px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .warning p {
            color: #92400e;
            margin: 0;
            font-size: 14px;
          }
          .icon-inline {
            display: inline-block;
            width: 16px;
            height: 16px;
            vertical-align: text-bottom;
          }
          .footer {
            background-color: #f9fafb;
            padding: 20px 30px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
          }
          .footer p {
            color: #6b7280;
            font-size: 14px;
            margin: 5px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>YourTime</h1>
          </div>
          <div class="content">
            <p>Olá!</p>
            <p>Recebemos uma solicitação para recuperação de senha da sua conta no YourTime.</p>
            <p>Use o código abaixo para continuar com a recuperação:</p>
            
            <div class="code-box">
              <div class="code">${codigo}</div>
            </div>
            
            <p>Este código é válido por <strong>10 minutos</strong>.</p>
            
            <div class="warning">
              <p><strong>Atenção:</strong> Se você não solicitou esta recuperação, ignore este email. Sua senha permanecerá segura.</p>
            </div>
            
            <p>Atenciosamente,<br><strong>Equipe YourTime</strong></p>
          </div>
          <div class="footer">
            <p>Este é um email automático, por favor não responda.</p>
            <p>&copy; ${new Date().getFullYear()} YourTime. Todos os direitos reservados.</p>
          </div>
        </div>
      </body>
    </html>
  `
}

export default {
  enviarCodigoRecuperacao
}
