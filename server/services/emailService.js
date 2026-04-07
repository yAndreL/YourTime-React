import nodemailer from 'nodemailer';

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function getTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    throw new Error('Credenciais SMTP nao configuradas. Defina SMTP_USER e SMTP_PASS no .env');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass }
  });
}

function gerarHTMLEmail(codigo) {
  const codigoEscapado = escapeHtml(codigo);
  const anoAtual = new Date().getFullYear();

  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Codigo de Recuperacao</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6; margin: 0; padding: 0; }
      .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
      .header { background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 40px 20px; text-align: center; }
      .header h1 { color: #ffffff; margin: 0; font-size: 28px; }
      .content { padding: 40px 30px; }
      .content p { color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; }
      .code-box { background-color: #f3f4f6; border: 2px dashed #d1d5db; border-radius: 8px; padding: 30px; text-align: center; margin: 30px 0; }
      .code { font-size: 48px; font-weight: bold; color: #1f2937; letter-spacing: 8px; font-family: 'Courier New', monospace; }
      .warning { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px 20px; margin: 20px 0; border-radius: 4px; }
      .warning p { color: #92400e; margin: 0; font-size: 14px; }
      .footer { background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb; }
      .footer p { color: #6b7280; font-size: 14px; margin: 5px 0; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header"><h1>YourTime</h1></div>
      <div class="content">
        <p>Ola!</p>
        <p>Recebemos uma solicitacao para recuperacao de senha da sua conta no YourTime.</p>
        <p>Use o codigo abaixo para continuar com a recuperacao:</p>
        <div class="code-box"><div class="code">${codigoEscapado}</div></div>
        <p>Este codigo e valido por <strong>10 minutos</strong>.</p>
        <div class="warning">
          <p><strong>Atencao:</strong> Se voce nao solicitou esta recuperacao, ignore este email. Sua senha permanecera segura.</p>
        </div>
        <p>Atenciosamente,<br><strong>Equipe YourTime</strong></p>
      </div>
      <div class="footer">
        <p>Este e um email automatico, por favor nao responda.</p>
        <p>&copy; ${anoAtual} YourTime. Todos os direitos reservados.</p>
      </div>
    </div>
  </body>
</html>`;
}

export async function enviarCodigoRecuperacao(email, codigo) {
  const transporter = getTransporter();

  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM || `"YourTime" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Codigo de Recuperacao de Senha - YourTime',
    html: gerarHTMLEmail(codigo)
  });

  return { success: true, messageId: info.messageId };
}
