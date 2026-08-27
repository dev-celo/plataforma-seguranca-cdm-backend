// routes/movimentacoes.js
import express from 'express';
import { autenticarUsuario } from '../middleware/planejamentoAuth.js';
import {
  listarMovimentacoes,
  criarMovimentacao,
  registrarDevolucao,
  listarMovimentacoesAtrasadas,
} from '../controllers/movimentacaoController.js';
import { setEmpresaContext } from '../middleware/empresaMiddleware.js';

const router = express.Router();

router.use(autenticarUsuario);
router.use(setEmpresaContext);

router.get('/', listarMovimentacoes);
router.get('/atrasadas', listarMovimentacoesAtrasadas);
router.post('/', criarMovimentacao);
router.post('/:id/devolucao', registrarDevolucao);

export default router;