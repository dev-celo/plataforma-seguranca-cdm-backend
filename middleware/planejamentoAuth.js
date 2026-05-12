// middleware/planejamentoAuth.js
import { auth } from '../services/firebaseAdmin.js';

export const autenticarUsuario = async (req, res, next) => {
  const token = req.headers.authorization?.split('Bearer ')[1];
  
  if (!token) {
    return res.status(401).json({ success: false, error: 'Token não fornecido' });
  }
  
  try {
    const decodedToken = await auth.verifyIdToken(token);
    req.usuario = decodedToken;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Token inválido' });
  }
};

export const verificarPermissaoCard = (req, res, next) => {
  const { usuario } = req;
  const { cardId } = req.params;
  
  // Admins podem fazer tudo (você pode definir um email ou claim)
  const isAdmin = usuario.email === 'marcelohenrique.backend@gmail.com' || usuario.admin === true;
  
  if (isAdmin) {
    req.isAdmin = true;
    return next();
  }
  
  // Para usuários comuns, vamos verificar se o card pertence a eles
  // Isso será feito no controller após buscar o card
  req.isAdmin = false;
  next();
};