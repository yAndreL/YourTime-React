const OFFLINE_BATIDAS_KEY = 'yourtime-offline-batidas';

class OfflineService {
  static estaOnline() {
    return navigator.onLine;
  }

  static salvarBatidaOffline(batida) {
    try {
      const batidas = this.obterBatidasOffline();
      batidas.push({
        ...batida,
        id_temp: `offline_${Date.now()}`,
        sincronizada: false,
        created_at_offline: new Date().toISOString()
      });
      localStorage.setItem(OFFLINE_BATIDAS_KEY, JSON.stringify(batidas));
      return true;
    } catch (error) {
      console.error('Erro ao salvar batida offline:', error);
      return false;
    }
  }

  static obterBatidasOffline() {
    try {
      const raw = localStorage.getItem(OFFLINE_BATIDAS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  static contarBatidasPendentes() {
    return this.obterBatidasOffline().filter(b => !b.sincronizada).length;
  }

  static async sincronizarBatidas(supabase) {
    const batidas = this.obterBatidasOffline().filter(b => !b.sincronizada);
    if (batidas.length === 0) return { sincronizadas: 0, erros: 0 };

    let sincronizadas = 0;
    let erros = 0;

    for (const batida of batidas) {
      try {
        const { id_temp, sincronizada, created_at_offline, ...dadosBatida } = batida;

        const { error } = await supabase
          .from('batidas')
          .insert([{
            ...dadosBatida,
            timestamp_cliente: created_at_offline
          }]);

        if (error) {
          erros++;
        } else {
          batida.sincronizada = true;
          sincronizadas++;
        }
      } catch {
        erros++;
      }
    }

    const atualizadas = this.obterBatidasOffline().map(b => {
      const match = batidas.find(s => s.id_temp === b.id_temp);
      return match || b;
    });
    localStorage.setItem(OFFLINE_BATIDAS_KEY, JSON.stringify(atualizadas));

    this.limparSincronizadas();

    return { sincronizadas, erros };
  }

  static limparSincronizadas() {
    try {
      const batidas = this.obterBatidasOffline().filter(b => !b.sincronizada);
      localStorage.setItem(OFFLINE_BATIDAS_KEY, JSON.stringify(batidas));
    } catch {}
  }

  static registrarServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('SW registrado:', registration.scope);
        })
        .catch(error => {
          console.error('Erro ao registrar SW:', error);
        });
    }
  }

  static inicializarListenersOnline(callbackOnline) {
    window.addEventListener('online', () => {
      if (callbackOnline) callbackOnline();
    });

    window.addEventListener('offline', () => {
      console.log('Modo offline ativado');
    });
  }
}

export default OfflineService;
