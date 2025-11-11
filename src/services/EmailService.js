/**
 * Serviço de envio de emails
 * 
 * Utiliza Edge Function do Supabase para evitar problemas de CORS
 * 
 * Para configurar:
 * 1. Criar conta no Resend (https://resend.com)
 * 2. Configurar RESEND_API_KEY nas Edge Functions do Supabase
 * 3. Deploy da Edge Function: supabase functions deploy enviar-email-recuperacao
 */

import { supabase } from '../config/supabase'

/**
 * Envia email com código de verificação usando Edge Function
 */
export const enviarCodigoRecuperacao = async (email, codigo) => {
  try {
    // MODO DESENVOLVIMENTO: Se estiver em localhost, apenas simula o envio
    const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    
    if (isDev) {
      console.log('🔧 MODO DEV - Email simulado')
      console.log('📧 Para:', email)
      console.log('🔐 Código:', codigo)
      // Simular delay de rede
      await new Promise(resolve => setTimeout(resolve, 500))
      return { success: true, dev: true, codigo }
    }

    // MODO PRODUÇÃO: Chama Edge Function do Supabase usando SDK
    // Isso usa automaticamente a autenticação do Supabase
    const { data, error } = await supabase.functions.invoke('enviar-email-recuperacao', {
      body: { email, codigo }
    })

    if (error) {
      console.error('Erro da Edge Function:', error)
      throw new Error(error.message || 'Erro ao enviar email')
    }

    return { success: true, data }
  } catch (error) {
    console.error('Erro ao enviar email:', error)
    throw error
  }
}


export default {
  enviarCodigoRecuperacao
}
