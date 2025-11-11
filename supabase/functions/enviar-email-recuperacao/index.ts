// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailRequest {
  email: string
  codigo: string
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Validar que a requisição vem do Supabase (opcional, mas recomendado)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const { email, codigo } = await req.json() as EmailRequest

    if (!email || !codigo) {
      return new Response(
        JSON.stringify({ error: 'Email e código são obrigatórios' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Email inválido' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get Resend API Key from environment (configurado no Supabase)
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      console.error('RESEND_API_KEY não configurada no Supabase')
      throw new Error('Configuração de email não disponível')
    }

    // Send email using Resend API
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`
      },
      body: JSON.stringify({
        from: 'YourTime <onboarding@resend.dev>',
        to: email,
        subject: 'Código de Recuperação de Senha - YourTime',
        html: gerarHTMLEmail(codigo)
      })
    })

    const resendData = await resendResponse.json()

    if (!resendResponse.ok) {
      console.error('Erro do Resend:', resendData)
      throw new Error(resendData.message || 'Erro ao enviar email')
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email enviado com sucesso',
        data: resendData 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Erro na Edge Function:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erro ao enviar email'
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: error 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

function gerarHTMLEmail(codigo: string): string {
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
              <p><strong>⚠️ Atenção:</strong> Se você não solicitou esta recuperação, ignore este email. Sua senha permanecerá segura.</p>
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
