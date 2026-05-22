// services/recurrenceService.js
import { db } from './firebaseAdmin.js';
import { COLLECTION, RECORRENCIA, criarInstanciaRecorrente } from '../models/Planejamento.js';

/**
 * Verifica tarefas recorrentes e cria novas instâncias
 * Deve ser executado diariamente (via cron job)
 */
export const processarTarefasRecorrentes = async () => {
  const hoje = new Date().toISOString().split('T')[0];
  const cardsSnapshot = await db.collection(COLLECTION).get();
  
  const novasTarefasCriadas = [];
  
  for (const cardDoc of cardsSnapshot.docs) {
    const cardData = cardDoc.data();
    const tarefas = cardData.tarefas || [];
    
    for (const tarefa of tarefas) {
      // Pular tarefas que não têm recorrência
      if (!tarefa.recorrencia || tarefa.recorrencia === RECORRENCIA.NENHUMA) continue;
      
      // Pular tarefas já concluídas (não gerar novas instâncias)
      if (tarefa.status === 'concluida') continue;
      
      // Verificar se a data fim já passou
      if (tarefa.dataFim < hoje) {
        // Criar nova instância recorrente
        const novaTarefa = await criarInstanciaRecorrente(cardDoc.id, tarefa);
        if (novaTarefa) {
          novasTarefasCriadas.push({
            cardId: cardDoc.id,
            tarefaOriginalId: tarefa.id,
            novaTarefaId: novaTarefa.id,
          });
        }
      }
    }
  }
  
  return novasTarefasCriadas;
};