// models/Planejamento.js
import { db } from '../services/firebaseAdmin.js';

const COLLECTION = 'planejamento';

/**
 * Valida os dados de um card de planejamento
 */
export const validarCard = (data) => {
  const errors = [];
  
  if (!data.responsavel || typeof data.responsavel !== 'string' || data.responsavel.trim() === '') {
    errors.push('Nome do responsável é obrigatório');
  }
  
  if (!data.cargo || typeof data.cargo !== 'string') {
    errors.push('Cargo é obrigatório');
  }
  
  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push('E-mail inválido');
  }
  
  return { valid: errors.length === 0, errors };
};

/**
 * Valida os dados de uma tarefa
 */
export const validarTarefa = (data) => {
  const errors = [];
  
  if (!data.titulo || typeof data.titulo !== 'string' || data.titulo.trim() === '') {
    errors.push('Título da tarefa é obrigatório');
  }
  
  if (!data.dataInicio || !/^\d{4}-\d{2}-\d{2}$/.test(data.dataInicio)) {
    errors.push('Data de início inválida (formato YYYY-MM-DD)');
  }
  
  if (!data.dataFim || !/^\d{4}-\d{2}-\d{2}$/.test(data.dataFim)) {
    errors.push('Data de fim inválida (formato YYYY-MM-DD)');
  }
  
  if (data.dataInicio && data.dataFim && data.dataInicio > data.dataFim) {
    errors.push('Data de início não pode ser maior que data de fim');
  }
  
  if (data.status && !['pendente', 'concluida', 'atrasada'].includes(data.status)) {
    errors.push('Status inválido');
  }
  
  return { valid: errors.length === 0, errors };
};

/**
 * Calcula o status da tarefa baseado nas datas
 */
export const calcularStatusTarefa = (tarefa) => {
  if (tarefa.status === 'concluida') return 'concluida';
  
  const hoje = new Date().toISOString().split('T')[0];
  if (tarefa.dataFim < hoje) {
    return 'atrasada';
  }
  return 'pendente';
};

/**
 * Atualiza o status de todas as tarefas de um card baseado nas datas
 */
export const atualizarStatusTarefas = async (cardId) => {
  try {
    const cardRef = db.collection(COLLECTION).doc(cardId);
    const card = await cardRef.get();
    
    if (!card.exists) {
      console.log(`⚠️ Card ${cardId} não encontrado`);
      return false;
    }
    
    const dados = card.data();
    let tarefasAtualizadas = false;
    const hoje = new Date().toISOString().split('T')[0];
    
    const tarefas = (dados.tarefas || []).map(tarefa => {
      if (tarefa.status === 'concluida') return tarefa;
      
      const novoStatus = tarefa.dataFim < hoje ? 'atrasada' : 'pendente';
      if (tarefa.status !== novoStatus) {
        tarefasAtualizadas = true;
        return { ...tarefa, status: novoStatus };
      }
      return tarefa;
    });
    
    if (tarefasAtualizadas) {
      await cardRef.update({ tarefas });
    }
    
    return tarefasAtualizadas;
  } catch (error) {
    console.error(`❌ Erro em atualizarStatusTarefas para card ${cardId}:`, error.message);
    return false;
  }
};

export { COLLECTION };