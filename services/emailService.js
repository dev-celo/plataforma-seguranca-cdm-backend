// services/emailService.js
import nodemailer from 'nodemailer';

// Configuração para testes (você pode mudar depois para um serviço real)
// Para usar com Gmail: https://myaccount.google.com/apppasswords
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // Seu e-mail
    pass: process.env.EMAIL_PASS, // Senha de aplicativo
  },
});

/**
 * Envia e-mail de notificação de tarefa atrasada
 */
export const enviarNotificacaoAtraso = async (destinatario, tarefa, responsavel) => {
  const assunto = `⚠️ Tarefa em atraso - Planejamento CDM`;
  const texto = `
Olá ${responsavel},

A seguinte tarefa está em atraso:

📋 Tarefa: ${tarefa.titulo}
📅 Data limite: ${tarefa.dataFim}
📝 Descrição: ${tarefa.descricao || 'Sem descrição adicional'}

Por favor, atualize o status da tarefa o mais breve possível.

Acesse o painel de planejamento para mais detalhes.

---
CDM Construtora - Gestão de Segurança do Trabalho
  `;

  try {
    const info = await transporter.sendMail({
      from: `"CDM Planejamento" <${process.env.EMAIL_USER}>`,
      to: destinatario,
      subject: assunto,
      text: texto,
    });
    console.log(`📧 E-mail enviado para ${destinatario}: ${info.messageId}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Erro ao enviar e-mail:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Verifica tarefas atrasadas e envia notificações
 * Esta função pode ser chamada após criar/editar tarefas ou via cron job
 */
export const verificarENotificarAtrasos = async (db, COLLECTION) => {
  const hoje = new Date().toISOString().split('T')[0];
  const snapshot = await db.collection(COLLECTION).get();
  
  const notificacoesEnviadas = [];
  
  for (const doc of snapshot.docs) {
    const card = doc.data();
    const tarefasAtrasadas = (card.tarefas || []).filter(
      t => t.status !== 'concluida' && t.dataFim < hoje
    );
    
    for (const tarefa of tarefasAtrasadas) {
      // Evitar enviar múltiplas notificações para a mesma tarefa
      if (!tarefa.notificadoAtraso) {
        const result = await enviarNotificacaoAtraso(card.email, tarefa, card.responsavel);
        if (result.success) {
          notificacoesEnviadas.push({
            cardId: doc.id,
            tarefaId: tarefa.id,
            email: card.email,
            tarefa: tarefa.titulo,
          });
          
          // Marcar como notificado para não enviar novamente
          const tarefasAtualizadas = (card.tarefas || []).map(t => 
            t.id === tarefa.id ? { ...t, notificadoAtraso: true } : t
          );
          await db.collection(COLLECTION).doc(doc.id).update({ tarefas: tarefasAtualizadas });
        }
      }
    }
  }
  
  return notificacoesEnviadas;
};