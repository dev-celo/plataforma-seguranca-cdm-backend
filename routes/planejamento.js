// routes/planejamento.js
import express from 'express';
import { autenticarUsuario } from '../services/planejamentoAuth.js';
import {
  listarCards,
  criarCard,
  atualizarCard,
  excluirCard,
  adicionarTarefa,
  atualizarTarefa,
  excluirTarefa,
  toggleConcluirTarefa,
  verificarNotificarAtrasos,
} from '../controllers/planejamentoController.js';

const router = express.Router();

// 🔥 TODAS as rotas exigem autenticação (via Firebase Auth)
router.use(autenticarUsuario);

// Rotas de Cards
router.get('/cards', listarCards);
router.post('/cards', criarCard);
router.put('/cards/:id', atualizarCard);
router.delete('/cards/:id', excluirCard);

// Rotas de Tarefas
router.post('/cards/:cardId/tarefas', adicionarTarefa);
router.put('/cards/:cardId/tarefas/:tarefaId', atualizarTarefa);
router.delete('/cards/:cardId/tarefas/:tarefaId', excluirTarefa);
router.patch('/cards/:cardId/tarefas/:tarefaId/toggle', toggleConcluirTarefa);

// Rota para verificar atrasos (apenas admin)
router.post('/verificar-atrasos', verificarNotificarAtrasos);

export default router;