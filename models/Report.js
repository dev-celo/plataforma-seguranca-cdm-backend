export const validateReport = (data) => {
  const required = ['data', 'turno', 'local', 'tstResponsavel', 'ddsRealizado', 'atividadesAcompanhadas', 'inspecoes', 'desviosIdentificados', 'classificacaoDesvios', 'acoesCorretivas', 'orientacoes', 'ferramentasSeguranca', 'indicadores', 'condicaoGeralArea'];
  const missing = required.filter(field => !data[field]);
  if (missing.length) return { valid: false, errors: missing.map(f => `${f} é obrigatório`) };
  
  // Validações específicas
  if (!['Manhã', 'Tarde', 'Noite'].includes(data.turno)) return { valid: false, errors: ['Turno inválido'] };
  if (!['Mônica', 'Vannic'].includes(data.tstResponsavel)) return { valid: false, errors: ['TST responsável inválido'] };
  if (data.indicadores.quantidadeInspecoes < 0) return { valid: false, errors: ['Quantidade de inspeções não pode ser negativa'] };
  
  return { valid: true };
};