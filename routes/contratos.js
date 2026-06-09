// routes/contratos.js
import express from 'express';
import { autenticarUsuario } from '../middleware/planejamentoAuth.js';
import {
  listarContratos,
  buscarContrato,
  criarContrato,
  atualizarContrato,
  excluirContrato,
} from '../controllers/contratoController.js';

const router = express.Router();

router.use(autenticarUsuario);

router.get('/', listarContratos);
router.get('/:id', buscarContrato);
router.post('/', criarContrato);
router.put('/:id', atualizarContrato);
router.delete('/:id', excluirContrato);

export default router;