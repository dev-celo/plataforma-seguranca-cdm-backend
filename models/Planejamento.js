// models/Planejamento.js
import { db } from '../services/firebaseAdmin.js';

const COLLECTION = 'planejamento';

// Tipos de recorrência
export const RECORRENCIA = {
  NENHUMA: 'nenhuma',
  DIARIA: 'diaria',
  SEMANAL: 'semanal',
  QUINZENAL: 'quinzenal',
  MENSAL: 'mensal',
};

/**
 * Valida os dados de um card de planejamento
 */
export const validarCard = (data) => {
  const errors = [];
  
  if (!data.responsavel || typeof data.responsavel !== 'string' || data.responsavel.trim() === '') {
    errors.push('Nome do responsável é obrigatório');
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
  
  // Validação da recorrência
  if (data.recorrencia && !Object.values(RECORRENCIA).includes(data.recorrencia)) {
    errors.push('Tipo de recorrência inválido');
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
  const cardRef = db.collection(COLLECTION).doc(cardId);
  const card = await cardRef.get();
  
  if (!card.exists) return false;
  
  const dados = card.data();
  let tarefasAtualizadas = false;
  
  const tarefas = (dados.tarefas || []).map(tarefa => {
    const novoStatus = calcularStatusTarefa(tarefa);
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
};

/**
 * Calcula a próxima data baseada na recorrência
 */
export const calcularProximaData = (dataAtual, recorrencia) => {
  const data = new Date(dataAtual);
  
  switch (recorrencia) {
    case RECORRENCIA.DIARIA:
      data.setDate(data.getDate() + 1);
      break;
    case RECORRENCIA.SEMANAL:
      data.setDate(data.getDate() + 7);
      break;
    case RECORRENCIA.QUINZENAL:
      data.setDate(data.getDate() + 15);
      break;
    case RECORRENCIA.MENSAL:
      data.setMonth(data.getMonth() + 1);
      break;
    default:
      return null;
  }
  
  return data.toISOString().split('T')[0];
};

/**
 * Cria uma nova instância de tarefa recorrente
 */
export const criarInstanciaRecorrente = async (cardId, tarefaOriginal) => {
  const hoje = new Date().toISOString().split('T')[0];
  const proximaDataInicio = calcularProximaData(tarefaOriginal.dataInicio, tarefaOriginal.recorrencia);
  const proximaDataFim = calcularProximaData(tarefaOriginal.dataFim, tarefaOriginal.recorrencia);
  
  if (!proximaDataInicio || !proximaDataFim) return null;
  
  const novaTarefa = {
    id: Date.now().toString(),
    titulo: tarefaOriginal.titulo,
    descricao: tarefaOriginal.descricao || '',
    dataInicio: proximaDataInicio,
    dataFim: proximaDataFim,
    status: 'pendente',
    anexo: tarefaOriginal.anexo || null,
    recorrencia: tarefaOriginal.recorrencia,
    tarefaOriginalId: tarefaOriginal.id,
    createdAt: new Date().toISOString(),
    notificadoAtraso: false,
  };
  
  const cardRef = db.collection(COLLECTION).doc(cardId);
  const card = await cardRef.get();
  const cardData = card.data();
  const tarefas = [...(cardData.tarefas || []), novaTarefa];
  
  await cardRef.update({ tarefas });
  
  return novaTarefa;
};

export { COLLECTION };