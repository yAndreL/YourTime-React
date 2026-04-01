import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useState } from 'react';
import { supabase } from '../config/supabase';
import ConfigService from '../services/ConfigService';

const STORAGE_KEY = 'yourtime-theme';

const ThemeContext = createContext(null);

function normalizarPreferenciaTema(raw) {
  if (raw == null || raw === '') return 'light';
  const s = String(raw).trim().toLowerCase();
  if (s === 'dark' || s === 'light' || s === 'system') return s;
  return 'light';
}

function obterPreferenciaSistemaEscuro() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function resolverTemaEscuro(theme) {
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  if (theme === 'system') return obterPreferenciaSistemaEscuro();
  return obterPreferenciaSistemaEscuro();
}

function aplicarClasseDocumento(theme) {
  const root = document.documentElement;
  const escuro = resolverTemaEscuro(theme);
  if (escuro) root.classList.add('dark');
  else root.classList.remove('dark');
}

function lerTemaArmazenado() {
  if (typeof window === 'undefined') return 'light';
  try {
    return normalizarPreferenciaTema(localStorage.getItem(STORAGE_KEY));
  } catch {
    return 'light';
  }
}

async function persistirPreferenciaTemaNoBanco(theme) {
  try {
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return;
    const res = await ConfigService.atualizarConfiguracoes(user.id, { preferencia_tema: theme });
    if (!res.success && import.meta.env.DEV) {
      console.warn('[YourTime] Não foi possível salvar preferencia_tema:', res.error);
    }
  } catch (e) {
    if (import.meta.env.DEV) console.warn('[YourTime] preferencia_tema:', e);
  }
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(lerTemaArmazenado);

  useLayoutEffect(() => {
    aplicarClasseDocumento(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  useEffect(() => {
    if (theme !== 'system') return undefined;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => aplicarClasseDocumento('system');
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [theme]);

  useEffect(() => {
    let cancelado = false;

    async function sincronizarPreferenciaParaUsuario(userId) {
      const res = await ConfigService.buscarConfiguracoes(userId);
      if (cancelado) return;
      if (res.success && res.data?.preferencia_tema != null && String(res.data.preferencia_tema).trim() !== '') {
        setThemeState(normalizarPreferenciaTema(res.data.preferencia_tema));
      }
    }

    const timeoutId = window.setTimeout(() => {
      void (async () => {
        const {
          data: { user }
        } = await supabase.auth.getUser();
        if (!user || cancelado) return;
        await sincronizarPreferenciaParaUsuario(user.id);
      })();
    }, 0);

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user && !cancelado) {
        void sincronizarPreferenciaParaUsuario(session.user.id);
      }
    });

    return () => {
      cancelado = true;
      window.clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const setTheme = useCallback(next => {
    const normalized = normalizarPreferenciaTema(next);
    setThemeState(normalized);
    void persistirPreferenciaTemaNoBanco(normalized);
  }, []);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme deve ser usado dentro de um ThemeProvider');
  }
  return ctx;
}
