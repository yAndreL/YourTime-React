import { useEffect, useRef, useState, useCallback } from 'react';

const markerIconUrl = 'data:image/svg+xml;base64,' + btoa(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36">' +
  '<path fill="#DC2626" d="M12 0C5.37 0 0 5.37 0 12c0 9 12 24 12 24s12-15 12-24C24 5.37 18.63 0 12 0z"/>' +
  '<circle cx="12" cy="12" r="6" fill="#fff"/>' +
  '</svg>'
);

const RAIO_OPTIONS = [50, 100, 200, 300, 500, 1000];
const DEFAULT_LAT = -14.235;
const DEFAULT_LON = -51.9253;

function GeocercaSelector({ latitude, longitude, raio, onChange }) {
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);
  const containerRef = useRef(null);
  const [erroCep, setErroCep] = useState('');
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [cepInput, setCepInput] = useState('');
  const leafletRef = useRef(null);
  const [leafletLoaded, setLeafletLoaded] = useState(false);

  // Load Leaflet once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const L = await import('leaflet');
        await import('leaflet/dist/leaflet.css');
        if (!cancelled) {
          leafletRef.current = L;
          setLeafletLoaded(true);
        }
      } catch (e) {
        console.error('[GeocercaSelector] Failed to load Leaflet:', e);
        setErroCep('Erro ao carregar mapa');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Initialize map once when Leaflet is ready
  useEffect(() => {
    if (!leafletLoaded || !containerRef.current || mapRef.current) return;

    const L = leafletRef.current;

    const containerEl = containerRef.current;

    const customIcon = L.icon({
      iconUrl: markerIconUrl,
      iconSize: [30, 45],
      iconAnchor: [15, 45],
      popupAnchor: [0, -45]
    });

    const map = L.map(containerEl, {
      zoomControl: true,
      dragging: true,
      scrollWheelZoom: true
    }).setView(
      [latitude ?? DEFAULT_LAT, longitude ?? DEFAULT_LON],
      latitude ? 16 : 4
    );

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    const marker = L.marker([latitude ?? DEFAULT_LAT, longitude ?? DEFAULT_LON], {
      icon: customIcon,
      draggable: true
    }).addTo(map);

    const currentRaio = raio ?? 100;
    const circle = L.circle([latitude ?? DEFAULT_LAT, longitude ?? DEFAULT_LON], {
      radius: currentRaio,
      color: '#3B82F6',
      fillColor: '#3B82F6',
      fillOpacity: 0.15,
      weight: 2
    }).addTo(map);

    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      if (onChange) onChange(pos.lat, pos.lng, raio ?? 100);
    });

    mapRef.current = map;
    markerRef.current = marker;
    circleRef.current = circle;

    map.invalidateSize();

    // Cleanup on unmount
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      circleRef.current = null;
    };
  }, [leafletLoaded]);

  // Update position when lat/lon change
  useEffect(() => {
    if (!mapRef.current) return;
    const lat = latitude ?? DEFAULT_LAT;
    const lon = longitude ?? DEFAULT_LON;
    console.log('[GeocercaSelector] update position:', lat, lon);
    mapRef.current.flyTo([lat, lon], 16, { duration: 0.5 });
    if (markerRef.current) markerRef.current.setLatLng([lat, lon]);
    if (circleRef.current) circleRef.current.setLatLng([lat, lon]);
  }, [latitude, longitude]);

  // Update radius
  useEffect(() => {
    if (!circleRef.current) return;
    circleRef.current.setRadius(raio ?? 100);
  }, [raio]);

  const atualizarRaio = (novoRaio) => {
    if (!circleRef.current) return;
    circleRef.current.setRadius(novoRaio);
    if (onChange) {
      const center = circleRef.current.getLatLng();
      onChange(center.lat, center.lng, novoRaio);
    }
  };

  const buscarCep = async () => {
    const cep = cepInput.replace(/\D/g, '');
    if (cep.length < 8) {
      setErroCep('CEP invalido');
      return;
    }
    setBuscandoCep(true);
    setErroCep('');
    try {
      const resp = await fetch(`/api/geocode?cep=${cep}`);
      if (!resp.ok) {
        setErroCep('Erro ao buscar CEP');
        return;
      }
      const data = await resp.json();
      if (!data.length) {
        setErroCep('CEP nao encontrado');
        return;
      }
      const latNum = parseFloat(data[0].lat);
      const lonNum = parseFloat(data[0].lon);
      console.log('[GeocercaSelector] CEP encontrado:', latNum, lonNum, data[0].display_name);
      if (mapRef.current) {
        mapRef.current.flyTo([latNum, lonNum], 16);
        if (markerRef.current) markerRef.current.setLatLng([latNum, lonNum]);
        if (circleRef.current) circleRef.current.setLatLng([latNum, lonNum]);
      }
      if (onChange) onChange(latNum, lonNum, raio ?? 100);
    } catch {
      setErroCep('Erro ao buscar CEP');
    } finally {
      setBuscandoCep(false);
    }
  };

  const usarMinhaLocalizacao = () => {
    navigator.geolocation.getCurrentPosition(pos => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      if (mapRef.current) {
        mapRef.current.flyTo([lat, lon], 16);
        if (markerRef.current) markerRef.current.setLatLng([lat, lon]);
        if (circleRef.current) circleRef.current.setLatLng([lat, lon]);
      }
      if (onChange) onChange(lat, lon, raio ?? 100);
    }, () => setErroCep('Nao foi possivel obter sua localizacao. Verifique se a permissao de geolocalizacao esta habilitada.'), { enableHighAccuracy: false, timeout: 10000 });
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        <div className="flex gap-1 flex-1 min-w-[180px]">
          <input
            type="text"
            value={cepInput}
            onChange={e => setCepInput(e.target.value)}
            placeholder="Buscar CEP (ex: 01001000)"
            maxLength={9}
            onKeyDown={e => e.key === 'Enter' && buscarCep()}
            className="flex-1 px-3 py-2 border rounded-md yt-field focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          <button
            type="button"
            onClick={buscarCep}
            disabled={buscandoCep}
            className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm transition-colors"
          >
            {buscandoCep ? '...' : 'Buscar'}
          </button>
        </div>
        <button
          type="button"
          onClick={usarMinhaLocalizacao}
          className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm transition-colors"
        >
          Minha localizacao
        </button>
      </div>

      <div className="flex gap-2 items-center">
        <label className="text-sm font-medium">Raio:</label>
        <select
          value={raio ?? 100}
          onChange={e => atualizarRaio(parseInt(e.target.value, 10))}
          className="px-2 py-1 border rounded-md text-sm yt-field focus:ring-blue-500 focus:border-blue-500"
        >
          {RAIO_OPTIONS.map(r => <option key={r} value={r}>{r}m</option>)}
        </select>
      </div>

      {erroCep && (
        <p className="text-sm text-red-600">{erroCep}</p>
      )}

      <div ref={containerRef} className="h-80 rounded-lg border border-gray-200 dark:border-gray-700 z-[1]" />
    </div>
  );
}

export default GeocercaSelector;
