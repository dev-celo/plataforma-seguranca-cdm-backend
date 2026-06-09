// controllers/movimentacaoController.js
import { db } from '../services/firebaseAdmin.js';
import { COLLECTIONS, validarMovimentacao, TIPO_MOVIMENTACAO, STATUS_ITEM } from '../models/Rastreamento.js';

/**
 * Listar movimentações
 * GET /api/movimentacoes
 */
export const listarMovimentacoes = async (req, res, next) => {
  try {
    const { itemId, tipo, contratoId, status, limit = 100 } = req.query;
    
    let query = db.collection(COLLECTIONS.MOVIMENTACOES).orderBy('createdAt', 'desc');
    
    if (itemId) {
      query = query.where('itemId', '==', itemId);
    }
    if (tipo) {
      query = query.where('tipo', '==', tipo);
    }
    
    const snapshot = await query.limit(parseInt(limit)).get();
    const movimentacoes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    res.json({ success: true, data: movimentacoes });
  } catch (error) {
    console.error('❌ Erro ao listar movimentações:', error);
    next(error);
  }
};

/**
 * Criar movimentação de saída (empréstimo)
 * POST /api/movimentacoes
 */
export const criarMovimentacao = async (req, res, next) => {
  try {
    const { usuario } = req;
    const { itemId, destinoContratoId, destinoLocal, dataPrevistaDevolucao, observacoes } = req.body;
    
    // Buscar item
    const itemRef = db.collection(COLLECTIONS.ITENS).doc(itemId);
    const item = await itemRef.get();
    
    if (!item.exists) {
      return res.status(404).json({ success: false, error: 'Item não encontrado' });
    }
    
    const itemData = item.data();
    
    // Verificar se item está disponível
    if (itemData.status !== STATUS_ITEM.DISPONIVEL) {
      return res.status(400).json({
        success: false,
        error: `Item não está disponível para empréstimo. Status atual: ${itemData.status}`
      });
    }
    
    const validation = validarMovimentacao({
      itemId,
      tipo: TIPO_MOVIMENTACAO.SAIDA,
      quantidade: 1,
      destinoLocal,
    });
    if (!validation.valid) {
      return res.status(400).json({ success: false, errors: validation.errors });
    }
    
    // Buscar contrato destino
    let contratoNome = null;
    if (destinoContratoId) {
      const contratoDoc = await db.collection(COLLECTIONS.CONTRATOS).doc(destinoContratoId).get();
      if (contratoDoc.exists) {
        contratoNome = contratoDoc.data().nome;
      }
    }
    
    // Criar movimentação
    const movimentacaoData = {
      itemId,
      itemNome: itemData.nome,
      itemCodigo: itemData.codigo,
      tipo: TIPO_MOVIMENTACAO.SAIDA,
      quantidade: 1,
      origemContratoId: itemData.contratoId,
      origemContratoNome: itemData.contratoNome,
      destinoContratoId: destinoContratoId || null,
      destinoContratoNome: contratoNome,
      destinoLocal,
      dataPrevistaDevolucao,
      responsavelRetirada: usuario.email,
      responsavelAutorizacao: usuario.email,
      observacoes,
      status: 'ativo',
      createdAt: new Date().toISOString(),
    };
    
    const movimentacaoRef = await db.collection(COLLECTIONS.MOVIMENTACOES).add(movimentacaoData);
    
    // Atualizar status do item
    await itemRef.update({
      status: STATUS_ITEM.EMPRESTADO,
      contratoId: destinoContratoId || null,
      contratoNome: contratoNome,
      localizacao: destinoLocal,
      ultimaMovimentacaoId: movimentacaoRef.id,
      updatedAt: new Date().toISOString(),
    });
    
    res.status(201).json({
      success: true,
      id: movimentacaoRef.id,
      data: movimentacaoData,
      message: 'Item emprestado com sucesso!'
    });
  } catch (error) {
    console.error('❌ Erro ao criar movimentação:', error);
    next(error);
  }
};

/**
 * Registrar devolução
 * POST /api/movimentacoes/:id/devolucao
 */
export const registrarDevolucao = async (req, res, next) => {
  try {
    const { usuario } = req;
    const { id } = req.params;
    const { observacoes } = req.body;
    
    const movimentacaoRef = db.collection(COLLECTIONS.MOVIMENTACOES).doc(id);
    const movimentacao = await movimentacaoRef.get();
    
    if (!movimentacao.exists) {
      return res.status(404).json({ success: false, error: 'Movimentação não encontrada' });
    }
    
    const movimentacaoData = movimentacao.data();
    
    if (movimentacaoData.tipo !== TIPO_MOVIMENTACAO.SAIDA) {
      return res.status(400).json({ success: false, error: 'Apenas movimentações de saída podem ser devolvidas' });
    }
    
    if (movimentacaoData.dataDevolucao) {
      return res.status(400).json({ success: false, error: 'Este item já foi devolvido' });
    }
    
    // Atualizar movimentação
    await movimentacaoRef.update({
      dataDevolucao: new Date().toISOString(),
      status: 'concluido',
      observacoesDevolucao: observacoes,
    });
    
    // Atualizar item para disponível
    const itemRef = db.collection(COLLECTIONS.ITENS).doc(movimentacaoData.itemId);
    await itemRef.update({
      status: STATUS_ITEM.DISPONIVEL,
      contratoId: null,
      contratoNome: null,
      localizacao: 'Almoxarifado Central',
      updatedAt: new Date().toISOString(),
    });
    
    // Criar movimentação de devolução
    await db.collection(COLLECTIONS.MOVIMENTACOES).add({
      itemId: movimentacaoData.itemId,
      itemNome: movimentacaoData.itemNome,
      itemCodigo: movimentacaoData.itemCodigo,
      tipo: TIPO_MOVIMENTACAO.DEVOLUCAO,
      quantidade: 1,
      origemLocal: movimentacaoData.destinoLocal,
      destinoLocal: 'Almoxarifado Central',
      movimentacaoOrigemId: id,
      responsavelAutorizacao: usuario.email,
      observacoes,
      createdAt: new Date().toISOString(),
    });
    
    res.json({ success: true, message: 'Devolução registrada com sucesso!' });
  } catch (error) {
    console.error('❌ Erro ao registrar devolução:', error);
    next(error);
  }
};

/**
 * Listar movimentações atrasadas
 * GET /api/movimentacoes/atrasadas
 */
export const listarMovimentacoesAtrasadas = async (req, res, next) => {
  try {
    const hoje = new Date().toISOString().split('T')[0];
    
    const snapshot = await db.collection(COLLECTIONS.MOVIMENTACOES)
      .where('tipo', '==', TIPO_MOVIMENTACAO.SAIDA)
      .where('status', '==', 'ativo')
      .where('dataPrevistaDevolucao', '<', hoje)
      .get();
    
    const atrasadas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    res.json({ success: true, data: atrasadas });
  } catch (error) {
    console.error('❌ Erro ao listar movimentações atrasadas:', error);
    next(error);
  }
};