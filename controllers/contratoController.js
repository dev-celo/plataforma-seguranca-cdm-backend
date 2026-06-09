// controllers/contratoController.js
import { db } from '../services/firebaseAdmin.js';
import { COLLECTIONS, validarContrato } from '../models/Rastreamento.js';

/**
 * Listar todos os contratos
 * GET /api/contratos
 */
export const listarContratos = async (req, res, next) => {
  try {
    const { status, responsavel } = req.query;
    
    let query = db.collection(COLLECTIONS.CONTRATOS).orderBy('createdAt', 'desc');
    
    if (status) {
      query = query.where('status', '==', status);
    }
    if (responsavel) {
      query = query.where('responsavel', '==', responsavel);
    }
    
    const snapshot = await query.get();
    const contratos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    res.json({ success: true, data: contratos });
  } catch (error) {
    console.error('❌ Erro ao listar contratos:', error);
    next(error);
  }
};

/**
 * Buscar contrato por ID
 * GET /api/contratos/:id
 */
export const buscarContrato = async (req, res, next) => {
  try {
    const { id } = req.params;
    const doc = await db.collection(COLLECTIONS.CONTRATOS).doc(id).get();
    
    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Contrato não encontrado' });
    }
    
    res.json({ success: true, data: { id: doc.id, ...doc.data() } });
  } catch (error) {
    console.error('❌ Erro ao buscar contrato:', error);
    next(error);
  }
};

/**
 * Criar novo contrato
 * POST /api/contratos
 */
export const criarContrato = async (req, res, next) => {
  try {
    const { usuario } = req;
    const admin = isAdmin(usuario); // Reutilizando função existente
    
    if (!admin) {
      return res.status(403).json({ success: false, error: 'Apenas administradores podem criar contratos' });
    }
    
    const validation = validarContrato(req.body);
    if (!validation.valid) {
      return res.status(400).json({ success: false, errors: validation.errors });
    }
    
    const contratoData = {
      ...req.body,
      status: 'ativo',
      createdBy: usuario.uid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    const docRef = await db.collection(COLLECTIONS.CONTRATOS).add(contratoData);
    
    res.status(201).json({
      success: true,
      id: docRef.id,
      data: { id: docRef.id, ...contratoData },
      message: 'Contrato criado com sucesso!'
    });
  } catch (error) {
    console.error('❌ Erro ao criar contrato:', error);
    next(error);
  }
};

/**
 * Atualizar contrato
 * PUT /api/contratos/:id
 */
export const atualizarContrato = async (req, res, next) => {
  try {
    const { usuario } = req;
    const admin = isAdmin(usuario);
    
    if (!admin) {
      return res.status(403).json({ success: false, error: 'Apenas administradores podem atualizar contratos' });
    }
    
    const { id } = req.params;
    const validation = validarContrato(req.body);
    if (!validation.valid) {
      return res.status(400).json({ success: false, errors: validation.errors });
    }
    
    const contratoRef = db.collection(COLLECTIONS.CONTRATOS).doc(id);
    const contrato = await contratoRef.get();
    
    if (!contrato.exists) {
      return res.status(404).json({ success: false, error: 'Contrato não encontrado' });
    }
    
    await contratoRef.update({
      ...req.body,
      updatedAt: new Date().toISOString(),
    });
    
    const contratoAtualizado = await contratoRef.get();
    
    res.json({
      success: true,
      data: { id: contratoAtualizado.id, ...contratoAtualizado.data() },
      message: 'Contrato atualizado com sucesso!'
    });
  } catch (error) {
    console.error('❌ Erro ao atualizar contrato:', error);
    next(error);
  }
};

/**
 * Excluir contrato (soft delete - apenas inativa)
 * DELETE /api/contratos/:id
 */
export const excluirContrato = async (req, res, next) => {
  try {
    const { usuario } = req;
    const admin = isAdmin(usuario);
    
    if (!admin) {
      return res.status(403).json({ success: false, error: 'Apenas administradores podem excluir contratos' });
    }
    
    const { id } = req.params;
    const contratoRef = db.collection(COLLECTIONS.CONTRATOS).doc(id);
    const contrato = await contratoRef.get();
    
    if (!contrato.exists) {
      return res.status(404).json({ success: false, error: 'Contrato não encontrado' });
    }
    
    await contratoRef.update({
      status: 'inativo',
      updatedAt: new Date().toISOString(),
    });
    
    res.json({ success: true, message: 'Contrato inativado com sucesso!' });
  } catch (error) {
    console.error('❌ Erro ao excluir contrato:', error);
    next(error);
  }
};

// Função auxiliar isAdmin (reutilizar a existente)
const isAdmin = (usuario) => {
  const adminEmails = [
    'marcelohenrique.backend@gmail.com',
    'viniciusbacelar@cdmconstrutoraba.com',
    'diego.montanha@cdmconstrutoraba.com'
  ];
  return adminEmails.includes(usuario.email?.toLowerCase().trim()) || usuario.admin === true;
};