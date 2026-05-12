import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import reportsRouter from './routes/reports.js';
import exportRouter from './routes/export.js';
import { errorHandler } from './middleware/errorHandler.js';
import planejamentoRouter from './routes/planejamento.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security
app.use(helmet());

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://plataforma-seguranca-cdm-frontend.vercel.app',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Permite requisições sem origem (como Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log(`❌ CORS bloqueou: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests from this IP'
});
app.use('/api/', limiter);

// ============================
// ROTAS
// ============================
app.use('/api/reports', reportsRouter);
app.use('/api/export', exportRouter);
app.use('/api/planejamento', planejamentoRouter);  // 🔥 MOVIDA PARA CÁ (antes do listen)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Global error handler
app.use(errorHandler);

// ============================
// INICIALIZAÇÃO DO SERVIDOR
// ============================
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`✅ CORS permitindo origens:`, allowedOrigins);
});