// models/Rastreamento.js
import { db } from '../services/firebaseAdmin.js';

// Coleções
export const COLLECTIONS = {
  CONTRATOS: 'contratos',
  CATEGORIAS: 'categorias',
  ITENS: 'itens',
  MOVIMENTACOES: 'movimentacoes',
};

// Status possíveis
export const STATUS_ITEM = {
  DISPONIVEL: 'disponivel',
  EMPRESTADO: 'emprestado',
  MANUTENCAO: 'manutencao',
  PERDIDO: 'perdido',
  BAIXADO: 'baixado',
};

export const TIPO_MOVIMENTACAO = {
  ENTRADA: 'entrada',
  SAIDA: 'saida',
  DEVOLUCAO: 'devolucao',
  PERDA: 'perda',
  MANUTENCAO: 'manutencao',
};

export const TIPO_ITEM = {
  MATERIAL: 'material',
  CONSUMIVEL: 'consumivel',
  FERRAMENTA: 'ferramenta',
  EQUIPAMENTO: 'equipamento',
};

// Categorias pré-definidas (para seed inicial)
export const CATEGORIAS_PADRAO = [
  { nome: 'Estrutura', tipo: TIPO_ITEM.MATERIAL, descricao: 'Vigas, metalon, pilares, perfis' },
  { nome: 'Parafusos e Fixadores', tipo: TIPO_ITEM.MATERIAL, descricao: 'Parafusos, porcas, arruelas' },
  { nome: 'Eletrodos', tipo: TIPO_ITEM.CONSUMIVEL, descricao: 'Eletrodos para solda' },
  { nome: 'Discos de Corte', tipo: TIPO_ITEM.CONSUMIVEL, descricao: 'Discos para corte e desbaste' },
  { nome: 'Tintas e Vernizes', tipo: TIPO_ITEM.CONSUMIVEL, descricao: 'Tintas, vernizes, solventes' },
  { nome: 'Ferramentas Manuais', tipo: TIPO_ITEM.FERRAMENTA, descricao: 'Martelos, chaves, alicates' },
  { nome: 'Ferramentas de Medição', tipo: TIPO_ITEM.FERRAMENTA, descricao: 'Eslimetros, trenas, níveis' },
  { nome: 'Equipamentos Elétricos', tipo: TIPO_ITEM.EQUIPAMENTO, descricao: 'Parafusadeiras, furadeiras' },
  { nome: 'Equipamentos de Corte', tipo: TIPO_ITEM.EQUIPAMENTO, descricao: 'Serras, roçadeiras, motosserras' },
  { nome: 'Equipamentos de Solda', tipo: TIPO_ITEM.EQUIPAMENTO, descricao: 'Inversoras, máscaras de solda' },
];

/**
 * Validação de Contrato
 */
export const validarContrato = (data) => {
  const errors = [];
  
  if (!data.numero || typeof data.numero !== 'string' || data.numero.trim() === '') {
    errors.push('Número do contrato é obrigatório');
  }
  if (!data.nome || typeof data.nome !== 'string' || data.nome.trim() === '') {
    errors.push('Nome do contrato é obrigatório');
  }
  if (!data.cliente || typeof data.cliente !== 'string' || data.cliente.trim() === '') {
    errors.push('Cliente é obrigatório');
  }
  if (!data.dataInicio || !/^\d{4}-\d{2}-\d{2}$/.test(data.dataInicio)) {
    errors.push('Data de início inválida');
  }
  if (!data.responsavel || typeof data.responsavel !== 'string') {
    errors.push('Responsável é obrigatório');
  }
  
  return { valid: errors.length === 0, errors };
};

/**
 * Validação de Item
 */
export const validarItem = (data) => {
  const errors = [];
  
  if (!data.nome || typeof data.nome !== 'string' || data.nome.trim() === '') {
    errors.push('Nome do item é obrigatório');
  }
  if (!data.categoriaId) {
    errors.push('Categoria é obrigatória');
  }
  if (data.quantidade === undefined || data.quantidade < 0) {
    errors.push('Quantidade inválida');
  }
  if (data.status && !Object.values(STATUS_ITEM).includes(data.status)) {
    errors.push('Status inválido');
  }
  
  return { valid: errors.length === 0, errors };
};

/**
 * Validação de Movimentação
 */
export const validarMovimentacao = (data) => {
  const errors = [];
  
  if (!data.itemId) {
    errors.push('Item é obrigatório');
  }
  if (!data.tipo || !Object.values(TIPO_MOVIMENTACAO).includes(data.tipo)) {
    errors.push('Tipo de movimentação inválido');
  }
  if (data.quantidade === undefined || data.quantidade <= 0) {
    errors.push('Quantidade inválida');
  }
  if (data.tipo === TIPO_MOVIMENTACAO.SAIDA && !data.destinoLocal) {
    errors.push('Destino é obrigatório para saída');
  }
  
  return { valid: errors.length === 0, errors };
};

/**
 * Gerar código sequencial para item
 */
export const gerarCodigoItem = async (categoriaNome) => {
  const prefixoMap = {
    'Estrutura': 'EST',
    'Parafusos e Fixadores': 'PRF',
    'Eletrodos': 'ELT',
    'Discos de Corte': 'DSC',
    'Tintas e Vernizes': 'TNV',
    'Ferramentas Manuais': 'FRM',
    'Ferramentas de Medição': 'FRM',
    'Equipamentos Elétricos': 'ELE',
    'Equipamentos de Corte': 'ECT',
    'Equipamentos de Solda': 'SLD',
  };
  
  const prefixo = prefixoMap[categoriaNome] || 'ITM';
  
  const snapshot = await db.collection(COLLECTIONS.ITENS)
    .where('codigo', '>=', `${prefixo}-`)
    .orderBy('codigo', 'desc')
    .limit(1)
    .get();
  
  let ultimoNumero = 0;
  if (!snapshot.empty) {
    const ultimoCodigo = snapshot.docs[0].data().codigo;
    const match = ultimoCodigo.match(/\d+$/);
    if (match) {
      ultimoNumero = parseInt(match[0]);
    }
  }
  
  const novoNumero = (ultimoNumero + 1).toString().padStart(3, '0');
  return `${prefixo}-${novoNumero}`;
};

/**
 * Inicializar categorias padrão
 */
export const inicializarCategorias = async () => {
  const snapshot = await db.collection(COLLECTIONS.CATEGORIAS).limit(1).get();
  if (snapshot.empty) {
    console.log('📦 Inicializando categorias padrão...');
    for (const categoria of CATEGORIAS_PADRAO) {
      await db.collection(COLLECTIONS.CATEGORIAS).add({
        ...categoria,
        createdAt: new Date().toISOString(),
      });
    }
    console.log(`✅ ${CATEGORIAS_PADRAO.length} categorias criadas`);
  }
};