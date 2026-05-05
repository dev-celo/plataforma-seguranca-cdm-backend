import { body, validationResult } from 'express-validator';

export const validateReport = [
  body('data').isISO8601().withMessage('Data inválida'),
  body('turno').isIn(['Manhã', 'Tarde', 'Noite', 'Integral']).withMessage('Turno inválido'),
  body('local').notEmpty().withMessage('Local é obrigatório'),
  body('tstResponsavel').isIn(['Mônica', 'Vannic']).withMessage('TST responsável inválido'),
  
  // Validação das inspeções (5 campos)
  body('inspecoes.epi').isBoolean().withMessage('Inspeção EPI inválida'),
  body('inspecoes.cincoS').isBoolean().withMessage('Inspeção 5S inválida'),
  body('inspecoes.equipamentos').isBoolean().withMessage('Inspeção equipamentos inválida'),
  body('inspecoes.acessoCirculacao').isBoolean().withMessage('Inspeção acesso/circulação inválida'),
  body('inspecoes.aptChecklist').isBoolean().withMessage('Inspeção APT/Checklist inválida'),
  
  // Validação dos desvios (array de objetos)
  body('desviosIdentificados').isArray().withMessage('Desvios deve ser um array'),
  body('desviosIdentificados.*.descricao').optional().isString(),
  body('desviosIdentificados.*.relacionadoEPI').isBoolean().withMessage('relacionadoEPI deve ser booleano'),
  
  // Validação das ações
  body('acoesCorretivas').isArray().withMessage('Ações corretivas deve ser um array'),
  body('acoesPreventivas').isArray().withMessage('Ações preventivas deve ser um array'),
  body('orientacoesCampo').isArray().withMessage('Orientações deve ser um array'),
  
  // Validação dos indicadores
  body('indicadores.quantidadeInspecoes').isInt({ min: 0 }).withMessage('Quantidade de inspeções inválida'),
  body('indicadores.quantidadeDesvios').isInt({ min: 0 }).withMessage('Quantidade de desvios inválida'),
  body('indicadores.quantidadeOrientacoes').isInt({ min: 0 }).withMessage('Quantidade de orientações inválida'),
  body('indicadores.desviosEPI').isInt({ min: 0 }).withMessage('Quantidade de desvios EPI inválida'),
  
  body('condicaoGeralArea').isIn(['Segura', 'Atenção', 'Crítica']).withMessage('Condição da área inválida'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }
    next();
  }
];