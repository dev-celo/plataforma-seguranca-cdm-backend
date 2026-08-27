import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import reportsRouter from './routes/reports.js';
import exportRouter from './routes/export.js';
import { errorHandler } from './middleware/errorHandler.js';
import planejamentoRouter from './routes/planejamento.js';

// 🔥 SISTEMA DE RASTREAMENTO
import contratosRouter from './routes/contratos.js';
import itensRouter from './routes/itens.js';
import movimentacoesRouter from './routes/movimentacoes.js';
import rastreamentoRelatoriosRouter from './routes/rastreamentoRelatorios.js';
import categoriasRouter from './routes/categorias.js';
import empresasRouter from './routes/empresas.js';  // ← NOVA

import { inicializarCategorias } from './models/Rastreamento.js';
import { verificarEmprestimosAtrasados } from './services/alertaService.js';
import cron from 'node-cron';

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
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP'
});
app.use('/api/', limiter);

// ============================
// ROTAS
// ============================
app.use('/api/reports', reportsRouter);
app.use('/api/export', exportRouter);
app.use('/api/planejamento', planejamentoRouter);
app.use('/api/contratos', contratosRouter);
app.use('/api/itens', itensRouter);
app.use('/api/movimentacoes', movimentacoesRouter);
app.use('/api/relatorios', rastreamentoRelatoriosRouter);
app.use('/api/categorias', categoriasRouter);
app.use('/api/empresas', empresasRouter);  // ← NOVA ROTA

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Global error handler
app.use(errorHandler);

// ============================
// INICIALIZAÇÃO
// ============================
const startServer = async () => {
  try {
    await inicializarCategorias();
    console.log('📦 Categorias de materiais inicializadas');
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`✅ CORS permitindo origens:`, allowedOrigins);
      console.log(`📋 Rotas ativas:`);
      console.log(`   - /api/contratos`);
      console.log(`   - /api/itens`);
      console.log(`   - /api/movimentacoes`);
      console.log(`   - /api/relatorios`);
      console.log(`   - /api/categorias`);
      console.log(`   - /api/empresas`);
    });
    
    cron.schedule('0 8 * * *', async () => {
      console.log('🔄 [CRON] Verificando empréstimos atrasados...');
      const resultado = await verificarEmprestimosAtrasados();
      if (resultado.success) {
        console.log(`✅ [CRON] ${resultado.totalAtrasados || 0} empréstimos atrasados`);
      } else {
        console.error('❌ [CRON] Erro:', resultado.error);
      }
    });
    
    console.log('⏰ [CRON] Agendamento ativado (08:00 diário)');
    
  } catch (error) {
    console.error('❌ Erro ao inicializar servidor:', error);
    process.exit(1);
  }
};

startServer();