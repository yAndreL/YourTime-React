import { supabase } from '../config/supabase';
export const enviarCodigoRecuperacao = async (email, codigo) => {
  try {
    const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isDev) {
      await new Promise(resolve => setTimeout(resolve, 500));
      return {
        success: true,
        dev: true,
        codigo
      };
    }
    const {
      data,
      error
    } = await supabase.functions.invoke('enviar-email-recuperacao', {
      body: {
        email,
        codigo
      }
    });
    if (error) {
      throw new Error(error.message || 'Erro ao enviar email');
    }
    if (data?.error) {
      throw new Error(data.error);
    }
    return {
      success: true,
      data
    };
  } catch (error) {
    throw error;
  }
};
export default {
  enviarCodigoRecuperacao
};
