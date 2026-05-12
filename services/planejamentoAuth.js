// services/planejamentoAuth.js
import { auth } from './firebaseAdmin.js';

/**
 * Middleware para autenticar usuário via Firebase Auth
 * Esta versão substitui o código fixo "construtoracdm"
 */
export const autenticarUsuario = async (req, res, next) => {
  const token = req.headers.authorization?.split('Bearer ')[1];
  
  if (!token) {
    return res.status(401).json({ 
      success: false, 
      error: 'Token de autenticação não fornecido' 
    });
  }
  
  try {
    const decodedToken = await auth.verifyIdToken(token);
    req.usuario = decodedToken;
    next();
  } catch (error) {
    console.error('❌ Erro ao verificar token:', error.message);
    return res.status(401).json({ 
      success: false, 
      error: 'Token inválido ou expirado' 
    });
  }
};