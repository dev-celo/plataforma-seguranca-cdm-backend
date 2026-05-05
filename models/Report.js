export const validateReport = (data) => {
  const required = [
    'data',
    'turno',
    'local',
    'tstResponsavel',
    'ddsRealizado',
    'atividadesAcompanhadas',
    'inspecoes',
    'desviosIdentificados',
    'classificacaoDesvios',
    'acoesCorretivas',
    'acoesPreventivas',
    'orientacoesCampo',
    'ferramentasSeguranca',
    'indicadores',
    'condicaoGeralArea'
  ];

  const missing = required.filter(field => !data[field]);
  if (missing.length) {
    return { 
      valid: false, 
      errors: missing.map(f => `${f} é obrigatório`) 
    };
  }

  // Validação do turno
  if (!['Manhã', 'Tarde', 'Noite', 'Integral'].includes(data.turno)) {
    return { valid: false, errors: ['Turno inválido'] };
  }

  // Validação do TST
  if (!['Mônica', 'Vannic'].includes(data.tstResponsavel)) {
    return { valid: false, errors: ['TST responsável inválido'] };
  }

  // Validação das inspeções (deve conter os 5 campos)
  const expectedInspecoes = ['epi', 'cincoS', 'equipamentos', 'acessoCirculacao', 'aptChecklist'];
  const hasAllInspecoes = expectedInspecoes.every(field => data.inspecoes.hasOwnProperty(field));
  if (!hasAllInspecoes) {
    return { valid: false, errors: ['Campos de inspeção incompletos'] };
  }

  // Validação do formato dos desvios (é array de objetos com descricao e relacionadoEPI)
  if (Array.isArray(data.desviosIdentificados)) {
    const invalidDesvio = data.desviosIdentificados.some(
      d => typeof d !== 'object' || typeof d.relacionadoEPI !== 'boolean'
    );
    if (invalidDesvio) {
      return { valid: false, errors: ['Formato de desvios inválido'] };
    }
  }

  return { valid: true };
};