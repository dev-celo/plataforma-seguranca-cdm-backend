// middleware/empresaMiddleware.js
import { db } from '../services/firebaseAdmin.js';

export const setEmpresaContext = async (req, res, next) => {
  try {
    // 1. Pegar empresa do header ou do usuário
    const empresaId = req.headers['x-empresa-id'] || req.usuario?.empresaId;
    
    if (!empresaId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Selecione uma empresa para continuar.' 
      });
    }
    
    // 2. Verificar se a empresa existe
    const empresaDoc = await db.collection('empresas').doc(empresaId).get();
    if (!empresaDoc.exists) {
      return res.status(404).json({ 
        success: false, 
        error: 'Empresa não encontrada' 
      });
    }
    
    req.empresaId = empresaId;
    req.empresa = { id: empresaId, ...empresaDoc.data() };
    next();
  } catch (error) {
    console.error('❌ Erro no middleware de empresa:', error);
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
};
