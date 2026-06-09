// routes/rastreamentoRelatorios.js
import express from 'express';
import { autenticarUsuario } from '../middleware/planejamentoAuth.js';
import {
  relatorioDashboard,
  relatorioItensPorContrato,
  relatorioEstoqueBaixo,
  relatorioEmprestimosPendentes,
  relatorioHistoricoItem,
} from '../controllers/rastreamentoRelatoriosController.js';

const router = express.Router();

router.use(autenticarUsuario);

router.get('/dashboard', relatorioDashboard);
router.get('/contrato/:contratoId', relatorioItensPorContrato);
router.get('/estoque-baixo', relatorioEstoqueBaixo);
router.get('/emprestimos-pendentes', relatorioEmprestimosPendentes);
router.get('/historico-item/:itemId', relatorioHistoricoItem);

export default router;  