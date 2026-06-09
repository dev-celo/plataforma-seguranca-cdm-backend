// routes/itens.js
import express from 'express';
import { autenticarUsuario } from '../middleware/planejamentoAuth.js';
import {
  listarItens,
  buscarItem,
  listarItensPorContrato,
  criarItem,
  atualizarItem,
  excluirItem,
  alterarStatusItem,
} from '../controllers/itemController.js';

const router = express.Router();

router.use(autenticarUsuario);

router.get('/', listarItens);
router.get('/:id', buscarItem);
router.get('/contrato/:contratoId', listarItensPorContrato);
router.post('/', criarItem);
router.put('/:id', atualizarItem);
router.delete('/:id', excluirItem);
router.patch('/:id/status', alterarStatusItem);

export default router;