// controllers/itemController.js
import { db } from '../services/firebaseAdmin.js';
import { COLLECTIONS, validarItem, STATUS_ITEM, gerarCodigoItem } from '../models/Rastreamento.js';

/**
 * Listar todos os itens
 * GET /api/itens
 */
export const listarItens = async (req, res, next) => {
  try {
    const { categoriaId, status, contratoId, busca } = req.query;
    
    let query = db.collection(COLLECTIONS.ITENS).orderBy('createdAt', 'desc');
    
    if (categoriaId) {
      query = query.where('categoriaId', '==', categoriaId);
    }
    if (status) {
      query = query.where('status', '==', status);
    }
    if (contratoId) {
      query = query.where('contratoId', '==', contratoId);
    }
    
    let snapshot = await query.get();
    let itens = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Busca textual (em memória para flexibilidade)
    if (busca) {
      const buscaLower = busca.toLowerCase();
      itens = itens.filter(item =>
        item.nome?.toLowerCase().includes(buscaLower) ||
        item.codigo?.toLowerCase().includes(buscaLower) ||
        item.observacoes?.toLowerCase().includes(buscaLower)
      );
    }
    
    res.json({ success: true, data: itens });
  } catch (error) {
    console.error('❌ Erro ao listar itens:', error);
    next(error);
  }
};

/**
 * Buscar item por ID
 * GET /api/itens/:id
 */
export const buscarItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const doc = await db.collection(COLLECTIONS.ITENS).doc(id).get();
    
    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Item não encontrado' });
    }
    
    res.json({ success: true, data: { id: doc.id, ...doc.data() } });
  } catch (error) {
    console.error('❌ Erro ao buscar item:', error);
    next(error);
  }
};

/**
 * Listar itens por contrato
 * GET /api/itens/contrato/:contratoId
 */
export const listarItensPorContrato = async (req, res, next) => {
  try {
    const { contratoId } = req.params;
    
    const snapshot = await db.collection(COLLECTIONS.ITENS)
      .where('contratoId', '==', contratoId)
      .orderBy('status')
      .get();
    
    const itens = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    res.json({ success: true, data: itens });
  } catch (error) {
    console.error('❌ Erro ao listar itens por contrato:', error);
    next(error);
  }
};

/**
 * Criar novo item
 * POST /api/itens
 */
export const criarItem = async (req, res, next) => {
  try {
    const { usuario } = req;
    const admin = isAdmin(usuario);
    
    if (!admin) {
      return res.status(403).json({ success: false, error: 'Apenas administradores podem criar itens' });
    }
    
    const validation = validarItem(req.body);
    if (!validation.valid) {
      return res.status(400).json({ success: false, errors: validation.errors });
    }
    
    // Buscar categoria para gerar código
    const categoriaDoc = await db.collection(COLLECTIONS.CATEGORIAS).doc(req.body.categoriaId).get();
    const categoriaNome = categoriaDoc.exists ? categoriaDoc.data().nome : 'Item';
    
    const codigo = await gerarCodigoItem(categoriaNome);
    
    const itemData = {
      codigo,
      ...req.body,
      status: req.body.status || STATUS_ITEM.DISPONIVEL,
      createdBy: usuario.uid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    const docRef = await db.collection(COLLECTIONS.ITENS).add(itemData);
    
    // Registrar movimentação de entrada
    await db.collection(COLLECTIONS.MOVIMENTACOES).add({
      itemId: docRef.id,
      itemNome: itemData.nome,
      itemCodigo: codigo,
      tipo: 'entrada',
      quantidade: itemData.quantidade,
      origemLocal: 'Estoque Inicial',
      responsavelAutorizacao: usuario.email,
      createdAt: new Date().toISOString(),
    });
    
    res.status(201).json({
      success: true,
      id: docRef.id,
      data: { id: docRef.id, ...itemData },
      message: 'Item criado com sucesso!'
    });
  } catch (error) {
    console.error('❌ Erro ao criar item:', error);
    next(error);
  }
};

/**
 * Atualizar item
 * PUT /api/itens/:id
 */
export const atualizarItem = async (req, res, next) => {
  try {
    const { usuario } = req;
    const admin = isAdmin(usuario);
    
    if (!admin) {
      return res.status(403).json({ success: false, error: 'Apenas administradores podem atualizar itens' });
    }
    
    const { id } = req.params;
    const validation = validarItem(req.body);
    if (!validation.valid) {
      return res.status(400).json({ success: false, errors: validation.errors });
    }
    
    const itemRef = db.collection(COLLECTIONS.ITENS).doc(id);
    const item = await itemRef.get();
    
    if (!item.exists) {
      return res.status(404).json({ success: false, error: 'Item não encontrado' });
    }
    
    await itemRef.update({
      ...req.body,
      updatedAt: new Date().toISOString(),
    });
    
    const itemAtualizado = await itemRef.get();
    
    res.json({
      success: true,
      data: { id: itemAtualizado.id, ...itemAtualizado.data() },
      message: 'Item atualizado com sucesso!'
    });
  } catch (error) {
    console.error('❌ Erro ao atualizar item:', error);
    next(error);
  }
};

/**
 * Excluir item (apenas admin)
 * DELETE /api/itens/:id
 */
export const excluirItem = async (req, res, next) => {
  try {
    const { usuario } = req;
    const admin = isAdmin(usuario);
    
    if (!admin) {
      return res.status(403).json({ success: false, error: 'Apenas administradores podem excluir itens' });
    }
    
    const { id } = req.params;
    const itemRef = db.collection(COLLECTIONS.ITENS).doc(id);
    const item = await itemRef.get();
    
    if (!item.exists) {
      return res.status(404).json({ success: false, error: 'Item não encontrado' });
    }
    
    await itemRef.delete();
    
    res.json({ success: true, message: 'Item excluído com sucesso!' });
  } catch (error) {
    console.error('❌ Erro ao excluir item:', error);
    next(error);
  }
};

/**
 * Alterar status do item (emprestar, devolver, colocar em manutenção)
 * PATCH /api/itens/:id/status
 */
export const alterarStatusItem = async (req, res, next) => {
  try {
    const { usuario } = req;
    const { id } = req.params;
    const { status, observacao } = req.body;
    
    const itemRef = db.collection(COLLECTIONS.ITENS).doc(id);
    const item = await itemRef.get();
    
    if (!item.exists) {
      return res.status(404).json({ success: false, error: 'Item não encontrado' });
    }
    
    const itemData = item.data();
    
    await itemRef.update({
      status,
      updatedAt: new Date().toISOString(),
      observacoes: observacao || itemData.observacoes,
    });
    
    // Registrar movimentação
    await db.collection(COLLECTIONS.MOVIMENTACOES).add({
      itemId: id,
      itemNome: itemData.nome,
      itemCodigo: itemData.codigo,
      tipo: status === STATUS_ITEM.EMPRESTADO ? 'saida' : status,
      quantidade: 1,
      responsavelAutorizacao: usuario.email,
      observacoes: observacao,
      createdAt: new Date().toISOString(),
    });
    
    res.json({
      success: true,
      message: `Status do item atualizado para ${status}`,
    });
  } catch (error) {
    console.error('❌ Erro ao alterar status do item:', error);
    next(error);
  }
};

const isAdmin = (usuario) => {
  const adminEmails = [
    'marcelohenrique.backend@gmail.com',
    'viniciusbacelar@cdmconstrutoraba.com',
    'diego.montanha@cdmconstrutoraba.com'
  ];
  return adminEmails.includes(usuario.email?.toLowerCase().trim()) || usuario.admin === true;
};