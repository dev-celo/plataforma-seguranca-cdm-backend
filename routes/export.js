import express from 'express';
import { exportToExcel } from '../controllers/exportController.js';
import { autenticarUsuario } from '../middleware/planejamentoAuth.js';
import { setEmpresaContext } from '../middleware/empresaMiddleware.js';

const router = express.Router();

router.use(autenticarUsuario);
router.use(setEmpresaContext);

router.get('/excel', exportToExcel);

export default router;