import { supabase } from '../config/supabase';

class GeoFotoService {
  static async capturarFoto() {
    return new Promise((resolve, reject) => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        resolve(null);
        return;
      }

      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 480, height: 480 } })
        .then(stream => {
          const video = document.createElement('video');
          video.srcObject = stream;
          video.setAttribute('playsinline', 'true');

          video.onloadedmetadata = () => {
            video.play();

            setTimeout(() => {
              const canvas = document.createElement('canvas');
              canvas.width = 480;
              canvas.height = 480;
              const ctx = canvas.getContext('2d');

              const size = Math.min(video.videoWidth, video.videoHeight);
              const sx = (video.videoWidth - size) / 2;
              const sy = (video.videoHeight - size) / 2;
              ctx.drawImage(video, sx, sy, size, size, 0, 0, 480, 480);

              stream.getTracks().forEach(track => track.stop());

              canvas.toBlob(blob => {
                resolve(blob);
              }, 'image/jpeg', 0.7);
            }, 500);
          };
        })
        .catch(() => {
          resolve(null);
        });
    });
  }

  static async uploadFotoBatida(userId, blob) {
    if (!blob) return null;

    try {
      const timestamp = Date.now();
      const caminho = `batidas/${userId}/${timestamp}.jpg`;

      const { data, error } = await supabase.storage
        .from('batidas-fotos')
        .upload(caminho, blob, {
          contentType: 'image/jpeg',
          cacheControl: '3600'
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('batidas-fotos')
        .getPublicUrl(caminho);

      return urlData?.publicUrl || null;
    } catch (error) {
      console.error('Erro ao fazer upload da foto:', error);
      return null;
    }
  }

  static async criarBucketFotosBatidas() {
    try {
      const { data: buckets } = await supabase.storage.listBuckets();
      const existe = buckets?.some(b => b.name === 'batidas-fotos');

      if (!existe) {
        await supabase.storage.createBucket('batidas-fotos', {
          public: true,
          fileSizeLimit: 2097152 // 2MB
        });
      }
    } catch (error) {
      console.error('Erro ao criar bucket:', error);
    }
  }

  static async capturarGeolocalizacao(timeoutMs = 10000) {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({ latitude: null, longitude: null, precisaoGps: null, erro: 'Geolocalização não suportada' });
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            precisaoGps: position.coords.accuracy,
            erro: null
          });
        },
        (error) => {
          resolve({ latitude: null, longitude: null, precisaoGps: null, erro: error.message });
        },
        { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 }
      );
    });
  }

  static verificarDentroDaCerca(lat, lng, cercaLat, cercaLng, raioMetros) {
    if (!lat || !lng || !cercaLat || !cercaLng || !raioMetros) return null;

    const R = 6371e3;
    const φ1 = lat * Math.PI / 180;
    const φ2 = cercaLat * Math.PI / 180;
    const Δφ = (cercaLat - lat) * Math.PI / 180;
    const Δλ = (cercaLng - lng) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distancia = R * c;

    return {
      dentroDoRaio: distancia <= raioMetros,
      distanciaMetros: Math.round(distancia),
      raioMetros
    };
  }

  static async buscarConfigCercaVirtual(superiorEmpresaId) {
    try {
      const { data, error } = await supabase
        .from('empresas')
        .select('latitude, longitude, raio_cerca_metros')
        .eq('id', superiorEmpresaId)
        .single();

      if (error || !data) return null;

      if (data.latitude && data.longitude && data.raio_cerca_metros) {
        return {
          latitude: parseFloat(data.latitude),
          longitude: parseFloat(data.longitude),
          raioMetros: parseInt(data.raio_cerca_metros)
        };
      }
      return null;
    } catch (error) {
      return null;
    }
  }
}

export default GeoFotoService;
