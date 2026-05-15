// controllers/planejamentoController.js
import { db } from '../services/firebaseAdmin.js';
import { auth } from '../services/firebaseAdmin.js';
import { COLLECTION, validarCard, validarTarefa, atualizarStatusTarefas } from '../models/Planejamento.js';
import { verificarENotificarAtrasos } from '../services/emailService.js';

// ============================
// FUNÇÕES AUXILIARES
// ============================

const ADMIN_EMAILS = [
  'marcelohenrique.backend@gmail.com',
  'viniciusbacelar@cdmconstrutoraba.com.br',
  'diego.montanha@cdmconstrutoraba.com'
];

const isAdmin = (usuario) => {
  const userEmail = usuario.email?.toLowerCase().trim();

  return (
    ADMIN_EMAILS.includes(userEmail) ||
    usuario.admin === true
  );
};
// ============================
// CRUD DE CARDS (RESPONSÁVEIS)
// ============================

/**
 * Listar cards (filtrados por usuário)
 * GET /api/planejamento/cards
 */
export const listarCards = async (req, res, next) => {
  try {
    const { usuario } = req;
    const admin = isAdmin(usuario);
    
    console.log(`📋 [DEBUG] Buscando cards para: ${usuario.email}`);
    console.log(`📋 [DEBUG] É admin? ${admin}`);
    console.log('📋 Usuário completo:', usuario);
    
    let query = db.collection(COLLECTION).orderBy('createdAt', 'desc');
    
    if (!admin) {
      console.log(`📋 [DEBUG] Filtrando por email: ${usuario.email}`);
      query = query.where('email', '==', usuario.email);
    }
    
    const snapshot = await query.get();
    console.log(`📋 [DEBUG] Documentos encontrados: ${snapshot.size}`);
    
    if (snapshot.empty) {
      console.log(`📋 [DEBUG] Nenhum card encontrado, retornando array vazio`);
      return res.json({ success: true, data: [] });
    }
    
    const cards = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log(`📋 [DEBUG] Cards carregados: ${cards.length}`);
    
    // Atualizar status das tarefas (se houver cards)
    for (const card of cards) {
      try {
        console.log(`📋 [DEBUG] Atualizando status do card: ${card.id}`);
        await atualizarStatusTarefas(card.id);
      } catch (updateError) {
        console.error(`❌ Erro ao atualizar card ${card.id}:`, updateError.message);
      }
    }
    
    // Buscar novamente para pegar status atualizados
    const snapshotAtualizado = await query.get();
    const cardsAtualizados = snapshotAtualizado.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    console.log(`✅ [DEBUG] Retornando ${cardsAtualizados.length} cards`);
    res.json({ success: true, data: cardsAtualizados });
    
  } catch (error) {
    console.error('❌ [DEBUG] Erro crítico em listarCards:', error);
    console.error('❌ [DEBUG] Stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno ao buscar planejamento',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * Criar um novo card (apenas admin)
 * POST /api/planejamento/cards
 */
export const criarCard = async (req, res, next) => {
  try {
    const { usuario } = req;
    
    if (!isAdmin(usuario)) {
      return res.status(403).json({ success: false, error: 'Apenas administradores podem criar cards' });
    }
    
    const { responsavel, cargo, email } = req.body;
    
    const validation = validarCard({ responsavel, cargo, email });
    if (!validation.valid) {
      return res.status(400).json({ success: false, errors: validation.errors });
    }
    
    // Buscar o UID do usuário pelo email
    let userId = null;
    try {
      const userRecord = await auth.getUserByEmail(email);
      userId = userRecord.uid;
    } catch (error) {
      console.log(`⚠️ Usuário com email ${email} não encontrado no Firebase Auth`);
    }
    
    const cardData = {
      responsavel: responsavel.trim(),
      cargo: cargo.trim(),
      email: email.trim(),
      userId,
      tarefas: [],
      createdBy: usuario.uid,
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
 * Atualizar um card (apenas admin)
 * PUT /api/planejamento/cards/:id
 */
export const atualizarCard = async (req, res, next) => {
  try {
    const { usuario } = req;
    
    if (!isAdmin(usuario)) {
      return res.status(403).json({ success: false, error: 'Apenas administradores podem editar cards' });
    }
    
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
 * Excluir um card (apenas admin)
 * DELETE /api/planejamento/cards/:id
 */
export const excluirCard = async (req, res, next) => {
  try {
    const { usuario } = req;
    
    if (!isAdmin(usuario)) {
      return res.status(403).json({ success: false, error: 'Apenas administradores podem excluir cards' });
    }
    
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
 * Adicionar tarefa (apenas admin)
 * POST /api/planejamento/cards/:cardId/tarefas
 */
export const adicionarTarefa = async (req, res, next) => {
  try {
    const { usuario } = req;
    const { cardId } = req.params;
    const { titulo, descricao, dataInicio, dataFim, anexo } = req.body;
    
    console.log('=' .repeat(60));
    console.log('📝 [ADICIONAR TAREFA] Iniciando...');
    console.log(`👤 Usuário logado: ${usuario.email}`);
    console.log(`🆔 UID: ${usuario.uid}`);
    console.log(`📌 Card ID: ${cardId}`);
    console.log(`📋 Dados da tarefa:`, { titulo, descricao, dataInicio, dataFim });
    
    const admin = isAdmin(usuario);
    console.log(`🔑 É admin? ${admin}`);
    
    const cardRef = db.collection(COLLECTION).doc(cardId);
    const card = await cardRef.get();
    
    if (!card.exists) {
      console.log('❌ Card não encontrado no Firestore');
      return res.status(404).json({ success: false, error: 'Card não encontrado' });
    }
    
    const cardData = card.data();
    console.log(`📇 Dono do card: ${cardData.email}`);
    console.log(`🔍 Comparação: "${cardData.email}" === "${usuario.email}" = ${cardData.email === usuario.email}`);
    
    const isOwner = cardData.email === usuario.email;
    
    // 🔥 PERMISSÃO: admin OU o próprio dono do card
    if (!admin && !isOwner) {
      console.log('❌ PERMISSÃO NEGADA! Usuário não tem autorização.');
      return res.status(403).json({ 
        success: false, 
        error: 'Você só pode adicionar tarefas ao seu próprio card',
        debug: { cardEmail: cardData.email, userEmail: usuario.email }
      });
    }
    
    console.log('✅ PERMISSÃO CONCEDIDA! Prosseguindo...');
    
    // Validação dos dados
    const validation = validarTarefa({ titulo, descricao, dataInicio, dataFim });
    if (!validation.valid) {
      console.log('❌ Dados inválidos:', validation.errors);
      return res.status(400).json({ success: false, errors: validation.errors });
    }
    
    const hoje = new Date().toISOString().split('T')[0];
    const status = dataFim < hoje ? 'atrasada' : 'pendente';
    console.log(`📅 Data hoje: ${hoje}, Data fim: ${dataFim}, Status: ${status}`);
    
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
    
    console.log(`📝 Nova tarefa criada:`, novaTarefa);
    
    const tarefas = [...(cardData.tarefas || []), novaTarefa];
    await cardRef.update({ 
      tarefas,
      updatedAt: new Date().toISOString(),
    });
    
    console.log(`✅ Tarefa adicionada com sucesso! Total de tarefas: ${tarefas.length}`);
    
    // Verificar se a tarefa já está atrasada para notificar
    if (status === 'atrasada') {
      console.log(`📧 Tarefa atrasada, enviando notificação para ${cardData.email}`);
      try {
        const { enviarNotificacaoAtraso } = await import('../services/emailService.js');
        await enviarNotificacaoAtraso(cardData.email, novaTarefa, cardData.responsavel);
        console.log('✅ Notificação enviada com sucesso');
      } catch (emailError) {
        console.error('❌ Erro ao enviar notificação:', emailError.message);
      }
    }
    
    console.log('=' .repeat(60));
    
    res.status(201).json({ 
      success: true, 
      data: novaTarefa,
      message: 'Tarefa adicionada com sucesso!' 
    });
  } catch (error) {
    console.error('❌ [ERRO] ao adicionar tarefa:', error.message);
    console.error('📚 Stack trace:', error.stack);
    console.log('=' .repeat(60));
    next(error);
  }
};

/**
 * Atualizar uma tarefa (apenas admin pode editar conteúdo)
 * PUT /api/planejamento/cards/:cardId/tarefas/:tarefaId
 */
export const atualizarTarefa = async (req, res, next) => {
  try {
    const { usuario } = req;
    const { cardId, tarefaId } = req.params;
    const { titulo, descricao, dataInicio, dataFim, anexo } = req.body;
    
    const admin = isAdmin(usuario);
    
    const cardRef = db.collection(COLLECTION).doc(cardId);
    const card = await cardRef.get();

    if (!admin) {
      return res.status(403).json({ success: false, error: 'Apenas administradores podem editar tarefas' });
    }
    
    if (!card.exists) {
      return res.status(404).json({ success: false, error: 'Card não encontrado' });
    }
    
    const cardData = card.data();
    const tarefas = cardData.tarefas || [];
    const index = tarefas.findIndex(t => t.id === tarefaId);
    
    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Tarefa não encontrada' });
    }
    
    // Se não for admin, verifica se o card pertence ao usuário
    if (!admin && cardData.email !== usuario.email) {
      return res.status(403).json({ success: false, error: 'Você não tem permissão para editar esta tarefa' });
    }
    
    const tarefaAtualizada = {
      ...tarefas[index],
      titulo: titulo?.trim() || tarefas[index].titulo,
      descricao: descricao?.trim() || tarefas[index].descricao,
      dataInicio: dataInicio || tarefas[index].dataInicio,
      dataFim: dataFim || tarefas[index].dataFim,
      anexo: anexo !== undefined ? anexo : tarefas[index].anexo,
      updatedAt: new Date().toISOString(),
    };
    
    // Recalcular status baseado na nova data
    const hoje = new Date().toISOString().split('T')[0];
    tarefaAtualizada.status = tarefaAtualizada.dataFim < hoje && tarefaAtualizada.status !== 'concluida' 
      ? 'atrasada' 
      : tarefaAtualizada.status;
    
    tarefas[index] = tarefaAtualizada;
    await cardRef.update({ tarefas });
    
    // Se a tarefa está atrasada e não foi notificada, enviar e-mail
    if (tarefaAtualizada.status === 'atrasada' && !tarefaAtualizada.notificadoAtraso) {
      const { enviarNotificacaoAtraso } = await import('../services/emailService.js');
      await enviarNotificacaoAtraso(cardData.email, tarefaAtualizada, cardData.responsavel);
      
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
 * Excluir uma tarefa (apenas admin)
 * DELETE /api/planejamento/cards/:cardId/tarefas/:tarefaId
 */
export const excluirTarefa = async (req, res, next) => {
  try {
    const { usuario } = req;
    
    if (!isAdmin(usuario)) {
      return res.status(403).json({ success: false, error: 'Apenas administradores podem excluir tarefas' });
    }
    
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
 * ✅ Usuários comuns podem fazer isso apenas em seus próprios cards
 */
export const toggleConcluirTarefa = async (req, res, next) => {
  try {
    const { usuario } = req;
    const { cardId, tarefaId } = req.params;
    
    const admin = isAdmin(usuario);
    
    const cardRef = db.collection(COLLECTION).doc(cardId);
    const card = await cardRef.get();
    
    if (!card.exists) {
      return res.status(404).json({ success: false, error: 'Card não encontrado' });
    }
    
    const cardData = card.data();
    
    // Verificar permissão
    if (!admin && cardData.email !== usuario.email) {
      return res.status(403).json({ success: false, error: 'Você não tem permissão para alterar esta tarefa' });
    }
    
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
      message: novoStatus === 'concluida' ? '✅ Tarefa concluída!' : '🔄 Tarefa reaberta!' 
    });
  } catch (error) {
    console.error('❌ Erro ao alternar status da tarefa:', error);
    next(error);
  }
};

/**
 * Verificar e notificar todas as tarefas atrasadas
 * POST /api/planejamento/verificar-atrasos
 */
export const verificarNotificarAtrasos = async (req, res, next) => {
  try {
    const { usuario } = req;
    
    if (!isAdmin(usuario)) {
      return res.status(403).json({ success: false, error: 'Apenas administradores podem executar esta ação' });
    }
    
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