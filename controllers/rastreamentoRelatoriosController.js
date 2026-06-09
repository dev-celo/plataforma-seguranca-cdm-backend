// controllers/rastreamentoRelatoriosController.js
import { db } from '../services/firebaseAdmin.js';
import { COLLECTIONS, STATUS_ITEM, TIPO_MOVIMENTACAO } from '../models/Rastreamento.js';

/**
 * Relatório: Itens por contrato
 * GET /api/relatorios/contrato/:contratoId
 */
export const relatorioItensPorContrato = async (req, res, next) => {
  try {
    const { contratoId } = req.params;
    
    const snapshot = await db.collection(COLLECTIONS.ITENS)
      .where('contratoId', '==', contratoId)
      .get();
    
    const itens = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    const stats = {
      total: itens.length,
      disponivel: itens.filter(i => i.status === STATUS_ITEM.DISPONIVEL).length,
      emprestado: itens.filter(i => i.status === STATUS_ITEM.EMPRESTADO).length,
      manutencao: itens.filter(i => i.status === STATUS_ITEM.MANUTENCAO).length,
    };
    
    res.json({ success: true, data: { stats, itens } });
  } catch (error) {
    console.error('❌ Erro:', error);
    next(error);
  }
};

/**
 * Relatório: Itens com estoque baixo (consumíveis)
 * GET /api/relatorios/estoque-baixo?limite=5
 */
export const relatorioEstoqueBaixo = async (req, res, next) => {
  try {
    const { limite = 5 } = req.query;
    
    const snapshot = await db.collection(COLLECTIONS.ITENS)
      .where('tipo', '==', 'consumivel')
      .get();
    
    const consumiveis = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const estoqueBaixo = consumiveis.filter(item => item.quantidade <= parseInt(limite));
    estoqueBaixo.sort((a, b) => a.quantidade - b.quantidade);
    
    res.json({ success: true, data: { limite: parseInt(limite), itens: estoqueBaixo } });
  } catch (error) {
    console.error('❌ Erro:', error);
    next(error);
  }
};

/**
 * Relatório: Empréstimos pendentes
 * GET /api/relatorios/emprestimos-pendentes?diasAtraso=0
 */
export const relatorioEmprestimosPendentes = async (req, res, next) => {
  try {
    const { diasAtraso = 0 } = req.query;
    const hoje = new Date();
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - parseInt(diasAtraso));
    
    const snapshot = await db.collection(COLLECTIONS.MOVIMENTACOES)
      .where('tipo', '==', TIPO_MOVIMENTACAO.SAIDA)
      .where('status', '==', 'ativo')
      .get();
    
    let emprestimos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    if (diasAtraso > 0) {
      emprestimos = emprestimos.filter(emp => 
        emp.dataPrevistaDevolucao && new Date(emp.dataPrevistaDevolucao) < dataLimite
      );
    }
    
    res.json({ success: true, data: emprestimos });
  } catch (error) {
    console.error('❌ Erro:', error);
    next(error);
  }
};

/**
 * Relatório: Histórico de movimentações de um item
 * GET /api/relatorios/historico-item/:itemId
 */
export const relatorioHistoricoItem = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    
    const movSnapshot = await db.collection(COLLECTIONS.MOVIMENTACOES)
      .where('itemId', '==', itemId)
      .orderBy('createdAt', 'desc')
      .get();
    
    const movimentacoes = movSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    const itemDoc = await db.collection(COLLECTIONS.ITENS).doc(itemId).get();
    const item = itemDoc.exists ? { id: itemDoc.id, ...itemDoc.data() } : null;
    
    res.json({ success: true, data: { item, movimentacoes } });
  } catch (error) {
    console.error('❌ Erro:', error);
    next(error);
  }
};

/**
 * Relatório: Dashboard resumo
 * GET /api/relatorios/dashboard
 */
export const relatorioDashboard = async (req, res, next) => {
  try {
    const contratosSnapshot = await db.collection(COLLECTIONS.CONTRATOS)
      .where('status', '==', 'ativo')
      .get();
    const totalContratosAtivos = contratosSnapshot.size;
    
    const itensSnapshot = await db.collection(COLLECTIONS.ITENS).get();
    const itens = itensSnapshot.docs.map(doc => doc.data());
    
    const itensPorStatus = {
      total: itens.length,
      disponivel: itens.filter(i => i.status === STATUS_ITEM.DISPONIVEL).length,
      emprestado: itens.filter(i => i.status === STATUS_ITEM.EMPRESTADO).length,
      manutencao: itens.filter(i => i.status === STATUS_ITEM.MANUTENCAO).length,
      perdido: itens.filter(i => i.status === STATUS_ITEM.PERDIDO).length,
      baixado: itens.filter(i => i.status === STATUS_ITEM.BAIXADO).length,
    };
    
    const emprestimosSnapshot = await db.collection(COLLECTIONS.MOVIMENTACOES)
      .where('tipo', '==', TIPO_MOVIMENTACAO.SAIDA)
      .where('status', '==', 'ativo')
      .get();
    const emprestimosAtivos = emprestimosSnapshot.size;
    
    res.json({
      success: true,
      data: {
        contratos: { ativos: totalContratosAtivos },
        itens: itensPorStatus,
        movimentacoes: { emprestimosAtivos }
      }
    });
  } catch (error) {
    console.error('❌ Erro:', error);
    next(error);
  }
};