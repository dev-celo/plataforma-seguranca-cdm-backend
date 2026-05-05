import express from 'express';
import { createReport, getReports, getReportById } from '../controllers/reportController.js';

const router = express.Router();

router.post('/', createReport);
router.get('/', getReports);
router.get('/:id', getReportById);

export default router;