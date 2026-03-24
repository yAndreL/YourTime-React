import { useEffect } from 'react';
import { supabase } from '../config/supabase';
import CacheService from '../services/CacheService';
export const useSecureCache = () => {
  useEffect(() => {
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        CacheService.clearAll();
        sessionStorage.removeItem('projectFilters');
        sessionStorage.removeItem('historicoFilters');
        sessionStorage.removeItem('currentUserId');
        sessionStorage.removeItem('user_is_admin');
      } else if (event === 'SIGNED_IN' && session?.user) {
        CacheService.clearExpired();
      } else if (event === 'USER_UPDATED') {} else if (event === 'TOKEN_REFRESHED') {}
    });
    return () => {
      subscription?.unsubscribe();
    };
  }, []);
  useEffect(() => {
    const interval = setInterval(() => {
      CacheService.clearExpired();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);
  return {
    clearUserCache: userId => CacheService.clearUserCache(userId),
    clearAll: () => CacheService.clearAll(),
    getCacheInfo: () => CacheService.getInfo()
  };
};
