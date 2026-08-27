// routes/categorias.js
import express from 'express';
import { db } from '../services/firebaseAdmin.js';
import { COLLECTIONS } from '../models/Rastreamento.js';
import { autenticarUsuario } from '../middleware/planejamentoAuth.js';
import { setEmpresaContext } from '../middleware/empresaMiddleware.js';

const router = express.Router();

// Todas as rotas de categorias exigem autenticação
router.use(autenticarUsuario);
router.use(setEmpresaContext);

/**
 * Listar todas as categorias
 * GET /api/categorias
 */
router.get('/', async (req, res, next) => {
  try {
    const snapshot = await db.collection(COLLECTIONS.CATEGORIAS).get();
    const categorias = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, data: categorias });
  } catch (error) {
    console.error('❌ Erro ao listar categorias:', error);
    next(error);
  }
});

/**
 * Criar uma nova categoria
 * POST /api/categorias
 */
router.post('/', async (req, res, next) => {
  try {
    const { nome, tipo, descricao } = req.body;
    
    if (!nome || !tipo) {
      return res.status(400).json({ success: false, error: 'Nome e tipo são obrigatórios' });
    }
    
    const categoriaData = {
      nome,
      tipo,
      descricao: descricao || '',
      createdAt: new Date().toISOString(),
    };
    
    const docRef = await db.collection(COLLECTIONS.CATEGORIAS).add(categoriaData);
    
    res.status(201).json({
      success: true,
      id: docRef.id,
      data: { id: docRef.id, ...categoriaData },
      message: 'Categoria criada com sucesso!'
    });
  } catch (error) {
    console.error('❌ Erro ao criar categoria:', error);
    next(error);
  }
});

export default router;