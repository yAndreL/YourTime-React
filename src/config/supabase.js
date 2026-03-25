import { createClient } from '@supabase/supabase-js';
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublicKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabasePublicKey) {
  throw new Error('Configure VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY (recomendado) ou VITE_SUPABASE_ANON_KEY (legado) no .env');
}
export const supabase = createClient(supabaseUrl, supabasePublicKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'X-Client-Info': 'yourtime-app@1.0.0'
    }
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});
export { createClient };
export const SUPABASE_CONFIG = {
  url: supabaseUrl,
  publicKey: supabasePublicKey,
  anonKey: supabasePublicKey,
  projectRef: supabaseUrl.match(/https:\/\/(.+?)\.supabase\.co/)?.[1] || '',
  region: 'us-east-2'
};
export default supabase;
