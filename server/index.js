import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRouter from './routes/auth.js';
import batidasRouter from './routes/batidas.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Valida variaveis obrigatorias
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('[Server] SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sao obrigatorias no .env');
  process.exit(1);
}

// Middleware
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Geocoding proxy (evita CORS do navegador com Nominatim)
// Fluxo Brasil: ViaCEP valida CEP → Nominatim geocodifica endereco
// Fluxo Internacional: Nominatim direto pela query
app.get('/api/geocode', async (req, res) => {
  const { cep } = req.query;
  if (!cep || typeof cep !== 'string' || cep.trim().length < 3) {
    return res.status(400).json({ error: 'Campo de busca e obrigatorio' });
  }
  const sanitized = cep.replace(/\D/g, '');
  const isCepBrasileiro = sanitized.length === 8 && /^\d{8}$/.test(sanitized);

  try {
    if (isCepBrasileiro) {
      // Fluxo BR: ViaCEP → endereco → Nominatim
      const viaCepResp = await fetch(`https://viacep.com.br/ws/${sanitized}/json/`);
      let viaCepData;
      try {
        viaCepData = await viaCepResp.json();
      } catch {
        return res.status(404).json({ error: 'CEP invalido' });
      }

      if (viaCepData.erro) {
        return res.status(404).json({ error: 'CEP nao encontrado' });
      }

      const { logradouro, bairro, localidade, uf } = viaCepData;
      const partes = [];
      if (logradouro) partes.push(logradouro);
      if (bairro) partes.push(bairro);
      if (localidade) partes.push(localidade);
      if (uf) partes.push(uf);

      if (partes.length === 0) {
        return res.json([{
          lat: '-14.235',
          lon: '-51.9253',
          display_name: viaCepData.cep
        }]);
      }

      const query = `${logradouro || ''}, ${bairro || ''}, ${localidade}, ${uf}, Brasil`;
      const nominatimResp = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
        { headers: { 'User-Agent': 'YourTime/1.0' } }
      );
      const nominatimData = await nominatimResp.json();

      res.json(nominatimData.length ? nominatimData : [{
        lat: '-14.235',
        lon: '-51.9253',
        display_name: `${viaCepData.cep} - ${localidade}, ${uf}`
      }]);
    } else {
      // Fluxo internacional: Nominatim direto com a query do usuario
      const nominatimResp = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cep.trim())}&format=json&limit=1`,
        { headers: { 'User-Agent': 'YourTime/1.0' } }
      );
      const nominatimData = await nominatimResp.json();

      if (nominatimData.length) {
        return res.json(nominatimData);
      }

      // Tenta adicionar "Brazil" como contexto se nao encontrou
      const fallbackResp = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cep.trim())}%2C%20Brasil&format=json&limit=1`,
        { headers: { 'User-Agent': 'YourTime/1.0' } }
      );
      const fallbackData = await fallbackResp.json();
      res.json(fallbackData.length ? fallbackData : []);
    }
  } catch (err) {
    console.error('[Geocode] Erro:', err.message);
    res.status(500).json({ error: 'Erro ao buscar localizacao' });
  }
});

// Routes
app.use('/api/auth', authRouter);
app.use('/api/batidas', batidasRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Rota nao encontrada' });
});

// Error handler (sem stack traces em producao)
app.use((err, _req, res, _next) => {
  console.error('[Server Error]', err.message);
  res.status(500).json({
    error: process.env.NODE_ENV === 'production' ? 'Erro interno do servidor' : err.message
  });
});

app.listen(PORT, () => {
  console.log(`[YourTime Server] rodando em http://localhost:${PORT}`);
});

export default app;
