// controllers/planejamentoController.js
import { db } from '../services/firebaseAdmin.js';
import { COLLECTION, validarCard, validarTarefa, calcularStatusTarefa, atualizarStatusTarefas } from '../models/Planejamento.js';
import { verificarENotificarAtrasos } from '../services/emailService.js';

// ============================
// CRUD DE CARDS (RESPONSÁVEIS)
// ============================

/**
 * Listar todos os cards de planejamento
 * GET /api/planejamento/cards
 */
export const listarCards = async (req, res, next) => {
  try {
    const snapshot = await db.collection(COLLECTION).orderBy('createdAt', 'desc').get();
    const cards = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Atualizar status das tarefas antes de enviar
    for (const card of cards) {
      await atualizarStatusTarefas(card.id);
    }
    
    // Buscar os cards atualizados
    const snapshotAtualizado = await db.collection(COLLECTION).orderBy('createdAt', 'desc').get();
    const cardsAtualizados = snapshotAtualizado.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    res.json({ success: true, data: cardsAtualizados });
  } catch (error) {
    console.error('❌ Erro ao listar cards:', error);
    next(error);
  }
};

/**
 * Criar um novo card de planejamento
 * POST /api/planejamento/cards
 */
export const criarCard = async (req, res, next) => {
  try {
    const { responsavel, cargo, email } = req.body;
    
    const validation = validarCard({ responsavel, cargo, email });
    if (!validation.valid) {
      return res.status(400).json({ success: false, errors: validation.errors });
    }
    
    const cardData = {
      responsavel: responsavel.trim(),
      cargo: cargo.trim(),
      email: email.trim(),
      tarefas: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    const docRef = await db.collection(COLLECTION).add(cardData);
    
    res.status(201).json({ 
      success: true, 
      id: docRef.id, 
      data: { id: docRef.id, ...cardData },
      message: 'Card criado com sucesso!' 
    });
  } catch (error) {
    console.error('❌ Erro ao criar card:', error);
    next(error);
  }
};

/**
 * Atualizar um card
 * PUT /api/planejamento/cards/:id
 */
export const atualizarCard = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { responsavel, cargo, email } = req.body;
    
    const validation = validarCard({ responsavel, cargo, email });
    if (!validation.valid) {
      return res.status(400).json({ success: false, errors: validation.errors });
    }
    
    const cardRef = db.collection(COLLECTION).doc(id);
    const card = await cardRef.get();
    
    if (!card.exists) {
      return res.status(404).json({ success: false, error: 'Card não encontrado' });
    }
    
    await cardRef.update({
      responsavel: responsavel.trim(),
      cargo: cargo.trim(),
      email: email.trim(),
      updatedAt: new Date().toISOString(),
    });
    
    const cardAtualizado = await cardRef.get();
    
    res.json({ 
      success: true, 
      data: { id: cardAtualizado.id, ...cardAtualizado.data() },
      message: 'Card atualizado com sucesso!' 
    });
  } catch (error) {
    console.error('❌ Erro ao atualizar card:', error);
    next(error);
  }
};

/**
 * Excluir um card (e todas as suas tarefas)
 * DELETE /api/planejamento/cards/:id
 */
export const excluirCard = async (req, res, next) => {
  try {
    const { id } = req.params;
    const cardRef = db.collection(COLLECTION).doc(id);
    const card = await cardRef.get();
    
    if (!card.exists) {
      return res.status(404).json({ success: false, error: 'Card não encontrado' });
    }
    
    await cardRef.delete();
    
    res.json({ success: true, message: 'Card excluído com sucesso!' });
  } catch (error) {
    console.error('❌ Erro ao excluir card:', error);
    next(error);
  }
};

// ============================
// CRUD DE TAREFAS
// ============================

/**
 * Adicionar tarefa a um card
 * POST /api/planejamento/cards/:cardId/tarefas
 */
export const adicionarTarefa = async (req, res, next) => {
  try {
    const { cardId } = req.params;
    const { titulo, descricao, dataInicio, dataFim, anexo } = req.body;
    
    const validation = validarTarefa({ titulo, descricao, dataInicio, dataFim });
    if (!validation.valid) {
      return res.status(400).json({ success: false, errors: validation.errors });
    }
    
    const cardRef = db.collection(COLLECTION).doc(cardId);
    const card = await cardRef.get();
    
    if (!card.exists) {
      return res.status(404).json({ success: false, error: 'Card não encontrado' });
    }
    
    const cardData = card.data();
    const hoje = new Date().toISOString().split('T')[0];
    const status = dataFim < hoje ? 'atrasada' : 'pendente';
    
    const novaTarefa = {
      id: Date.now().toString(),
      titulo: titulo.trim(),
      descricao: descricao?.trim() || '',
      dataInicio,
      dataFim,
      status,
      anexo: anexo || null,
      createdAt: new Date().toISOString(),
      notificadoAtraso: false,
    };
    
    const tarefas = [...(cardData.tarefas || []), novaTarefa];
    await cardRef.update({ 
      tarefas,
      updatedAt: new Date().toISOString(),
    });
    
    // Verificar se a tarefa já está atrasada para notificar
    if (status === 'atrasada') {
      const { enviarNotificacaoAtraso } = await import('../services/emailService.js');
      await enviarNotificacaoAtraso(cardData.email, novaTarefa, cardData.responsavel);
    }
    
    res.status(201).json({ 
      success: true, 
      data: novaTarefa,
      message: 'Tarefa adicionada com sucesso!' 
    });
  } catch (error) {
    console.error('❌ Erro ao adicionar tarefa:', error);
    next(error);
  }
};

/**
 * Atualizar uma tarefa
 * PUT /api/planejamento/cards/:cardId/tarefas/:tarefaId
 */
export const atualizarTarefa = async (req, res, next) => {
  try {
    const { cardId, tarefaId } = req.params;
    const { titulo, descricao, dataInicio, dataFim, status, anexo } = req.body;
    
    const validation = validarTarefa({ titulo, descricao, dataInicio, dataFim, status });
    if (!validation.valid) {
      return res.status(400).json({ success: false, errors: validation.errors });
    }
    
    const cardRef = db.collection(COLLECTION).doc(cardId);
    const card = await cardRef.get();
    
    if (!card.exists) {
      return res.status(404).json({ success: false, error: 'Card não encontrado' });
    }
    
    const cardData = card.data();
    const tarefas = cardData.tarefas || [];
    const index = tarefas.findIndex(t => t.id === tarefaId);
    
    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Tarefa não encontrada' });
    }
    
    // Calcular status automaticamente se não foi enviado
    let novoStatus = status;
    if (!novoStatus) {
      const hoje = new Date().toISOString().split('T')[0];
      novoStatus = dataFim < hoje ? 'atrasada' : 'pendente';
    }
    
    const tarefaAtualizada = {
      ...tarefas[index],
      titulo: titulo.trim(),
      descricao: descricao?.trim() || '',
      dataInicio,
      dataFim,
      status: novoStatus,
      anexo: anexo || null,
      updatedAt: new Date().toISOString(),
    };
    
    tarefas[index] = tarefaAtualizada;
    await cardRef.update({ tarefas });
    
    // Se a tarefa está atrasada e não foi notificada, enviar e-mail
    if (novoStatus === 'atrasada' && !tarefaAtualizada.notificadoAtraso) {
      const { enviarNotificacaoAtraso } = await import('../services/emailService.js');
      await enviarNotificacaoAtraso(cardData.email, tarefaAtualizada, cardData.responsavel);
      
      // Marcar como notificada
      tarefaAtualizada.notificadoAtraso = true;
      tarefas[index] = tarefaAtualizada;
      await cardRef.update({ tarefas });
    }
    
    res.json({ 
      success: true, 
      data: tarefaAtualizada,
      message: 'Tarefa atualizada com sucesso!' 
    });
  } catch (error) {
    console.error('❌ Erro ao atualizar tarefa:', error);
    next(error);
  }
};

/**
 * Excluir uma tarefa
 * DELETE /api/planejamento/cards/:cardId/tarefas/:tarefaId
 */
export const excluirTarefa = async (req, res, next) => {
  try {
    const { cardId, tarefaId } = req.params;
    
    const cardRef = db.collection(COLLECTION).doc(cardId);
    const card = await cardRef.get();
    
    if (!card.exists) {
      return res.status(404).json({ success: false, error: 'Card não encontrado' });
    }
    
    const cardData = card.data();
    const tarefas = (cardData.tarefas || []).filter(t => t.id !== tarefaId);
    
    if (tarefas.length === (cardData.tarefas || []).length) {
      return res.status(404).json({ success: false, error: 'Tarefa não encontrada' });
    }
    
    await cardRef.update({ tarefas });
    
    res.json({ success: true, message: 'Tarefa excluída com sucesso!' });
  } catch (error) {
    console.error('❌ Erro ao excluir tarefa:', error);
    next(error);
  }
};

/**
 * Alternar status de conclusão de uma tarefa (toggle)
 * PATCH /api/planejamento/cards/:cardId/tarefas/:tarefaId/toggle
 */
export const toggleConcluirTarefa = async (req, res, next) => {
  try {
    const { cardId, tarefaId } = req.params;
    
    const cardRef = db.collection(COLLECTION).doc(cardId);
    const card = await cardRef.get();
    
    if (!card.exists) {
      return res.status(404).json({ success: false, error: 'Card não encontrado' });
    }
    
    const cardData = card.data();
    const tarefas = cardData.tarefas || [];
    const index = tarefas.findIndex(t => t.id === tarefaId);
    
    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Tarefa não encontrada' });
    }
    
    const novoStatus = tarefas[index].status === 'concluida' ? 'pendente' : 'concluida';
    tarefas[index].status = novoStatus;
    tarefas[index].updatedAt = new Date().toISOString();
    
    await cardRef.update({ tarefas });
    
    res.json({ 
      success: true, 
      data: tarefas[index],
      message: novoStatus === 'concluida' ? 'Tarefa concluída!' : 'Tarefa reaberta!' 
    });
  } catch (error) {
    console.error('❌ Erro ao alternar status da tarefa:', error);
    next(error);
  }
};

/**
 * Verificar e notificar todas as tarefas atrasadas (endpoint para cron job)
 * POST /api/planejamento/verificar-atrasos
 */
export const verificarNotificarAtrasos = async (req, res, next) => {
  try {
    const notificacoes = await verificarENotificarAtrasos(db, COLLECTION);
    res.json({ 
      success: true, 
      notificacoesEnviadas: notificacoes.length,
      detalhes: notificacoes,
      message: `Verificação concluída. ${notificacoes.length} notificações enviadas.` 
    });
  } catch (error) {
    console.error('❌ Erro ao verificar atrasos:', error);
    next(error);
  }
};