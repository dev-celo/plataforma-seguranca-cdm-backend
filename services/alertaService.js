// services/alertaService.js
import { db } from './firebaseAdmin.js';
import { COLLECTIONS, TIPO_MOVIMENTACAO } from '../models/Rastreamento.js';

/**
 * Verifica empréstimos atrasados e envia alertas
 * Pode ser chamado por um cron job diariamente
 */
export const verificarEmprestimosAtrasados = async () => {
  try {
    const hoje = new Date();
    const hojeStr = hoje.toISOString().split('T')[0];
    
    // Buscar empréstimos ativos com data de devolução prevista anterior a hoje
    const snapshot = await db.collection(COLLECTIONS.MOVIMENTACOES)
      .where('tipo', '==', TIPO_MOVIMENTACAO.SAIDA)
      .where('status', '==', 'ativo')
      .where('dataPrevistaDevolucao', '<', hojeStr)
      .get();
    
    const atrasados = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    if (atrasados.length === 0) {
      console.log('✅ Nenhum empréstimo atrasado encontrado');
      return { success: true, atrasados: [] };
    }
    
    console.log(`⚠️ Encontrados ${atrasados.length} empréstimos atrasados`);
    
    // Agrupar por responsável para enviar notificações
    const porResponsavel = {};
    for (const emprestimo of atrasados) {
      const email = emprestimo.responsavelRetirada;
      if (!porResponsavel[email]) {
        porResponsavel[email] = {
          email,
          emprestimos: [],
        };
      }
      
      // Buscar informações do item
      const itemDoc = await db.collection(COLLECTIONS.ITENS).doc(emprestimo.itemId).get();
      const item = itemDoc.exists ? itemDoc.data() : null;
      
      porResponsavel[email].emprestimos.push({
        id: emprestimo.id,
        itemNome: emprestimo.itemNome,
        itemCodigo: emprestimo.itemCodigo,
        dataPrevistaDevolucao: emprestimo.dataPrevistaDevolucao,
        diasAtraso: Math.floor((new Date() - new Date(emprestimo.dataPrevistaDevolucao)) / (1000 * 60 * 60 * 24)),
        destinoLocal: emprestimo.destinoLocal,
      });
    }
    
    // Enviar notificações (email ou sistema)
    const notificacoesEnviadas = [];
    for (const [email, dados] of Object.entries(porResponsavel)) {
      const notificacao = await enviarAlertaAtraso(email, dados.emprestimos);
      notificacoesEnviadas.push(notificacao);
    }
    
    return {
      success: true,
      totalAtrasados: atrasados.length,
      notificacoesEnviadas: notificacoesEnviadas.length,
      detalhes: porResponsavel,
    };
  } catch (error) {
    console.error('❌ Erro ao verificar empréstimos atrasados:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Envia alerta de atraso para um responsável
 */
const enviarAlertaAtraso = async (email, emprestimos) => {
  try {
    const assunto = `⚠️ CDM - Empréstimos em atraso`;
    const texto = `
Olá,

Você possui ${emprestimos.length} empréstimo(s) em atraso:

${emprestimos.map(emp => `
📦 Item: ${emp.itemNome} (${emp.itemCodigo})
📍 Local: ${emp.destinoLocal}
📅 Data prevista: ${emp.dataPrevistaDevolucao}
⏰ Dias em atraso: ${emp.diasAtraso}
`).join('\n')}

Por favor, regularize a devolução o mais breve possível.

---
CDM Construtora - Controle de Materiais
    `;
    
    // Aqui você pode integrar com seu serviço de email (nodemailer, resend, etc.)
    console.log(`📧 [ALERTA] E-mail para ${email}: ${assunto}`);
    console.log(`📧 Conteúdo: ${texto.substring(0, 200)}...`);
    
    // Registrar notificação no banco
    const notificacaoRef = await db.collection('notificacoes').add({
      tipo: 'emprestimo_atrasado',
      destinatario: email,
      emprestimos: emprestimos.map(e => e.id),
      enviadoEm: new Date().toISOString(),
      lido: false,
    });
    
    return {
      email,
      quantidade: emprestimos.length,
      notificacaoId: notificacaoRef.id,
      enviado: true,
    };
  } catch (error) {
    console.error(`❌ Erro ao enviar alerta para ${email}:`, error);
    return {
      email,
      quantidade: emprestimos.length,
      enviado: false,
      error: error.message,
    };
  }
};

/**
 * Marca notificação como lida
 */
export const marcarNotificacaoComoLida = async (notificacaoId) => {
  try {
    await db.collection('notificacoes').doc(notificacaoId).update({
      lido: true,
      lidoEm: new Date().toISOString(),
    });
    return { success: true };
  } catch (error) {
    console.error('❌ Erro ao marcar notificação como lida:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Listar notificações não lidas de um usuário
 */
export const listarNotificacoesNaoLidas = async (email) => {
  try {
    const snapshot = await db.collection('notificacoes')
      .where('destinatario', '==', email)
      .where('lido', '==', false)
      .orderBy('enviadoEm', 'desc')
      .get();
    
    const notificacoes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return { success: true, data: notificacoes };
  } catch (error) {
    console.error('❌ Erro ao listar notificações:', error);
    return { success: false, error: error.message };
  }
};