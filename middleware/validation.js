import { body, validationResult } from 'express-validator';

export const validateReport = [
  body('data').isISO8601().withMessage('Data inválida'),
  body('turno').isIn(['Manhã', 'Tarde', 'Noite']),
  body('tstResponsavel').isIn(['Mônica', 'Vannic']),
  body('ddsRealizado.tema').optional().isString(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    next();
  }
];