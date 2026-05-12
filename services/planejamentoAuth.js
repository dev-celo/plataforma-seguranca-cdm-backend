// services/planejamentoAuth.js
const ACCESS_CODE = 'construtoracdm';

/**
 * Valida o código de acesso enviado na requisição
 * Pode vir via query string (?codigo=xxx) ou header (x-access-code)
 */
export const validarAcessoPlanejamento = (req, res, next) => {
  const codigo = req.query.codigo || req.headers['x-access-code'];
  
  if (!codigo) {
    return res.status(401).json({ 
      success: false, 
      error: 'Código de acesso não informado' 
    });
  }
  
  if (codigo !== ACCESS_CODE) {
    return res.status(403).json({ 
      success: false, 
      error: 'Código de acesso inválido' 
    });
  }
  
  next();
};