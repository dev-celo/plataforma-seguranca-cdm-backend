import express from 'express';
import { createReport, getReports, getReportById } from '../controllers/reportController.js';
// import { authenticate } from '../middleware/auth.js';
import { validateReport } from '../middleware/validation.js';

const router = express.Router();

// router.use(authenticate); // se quiser proteger todas as rotas
router.post('/', validateReport, createReport);
router.get('/', getReports);
router.get('/:id', getReportById);

export default router;