import { db } from '../services/firebaseAdmin.js';
import ExcelJS from 'exceljs';

export const exportToExcel = async (req, res, next) => {
  try {
    const { startDate, endDate, tst } = req.query;
    let query = db.collection('reports').orderBy('createdAt', 'desc');
    if (startDate) query = query.where('createdAt', '>=', startDate);
    if (endDate) query = query.where('createdAt', '<=', endDate);
    if (tst && tst !== 'Todos') query = query.where('tstResponsavel', '==', tst);

    const snapshot = await query.get();
    const reports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Plataforma Segurança';
    workbook.created = new Date();
    const worksheet = workbook.addWorksheet('Relatórios de Segurança');

    // Estilos
    const headerStyle = {
      font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2C3E50' } },
      alignment: { horizontal: 'center', vertical: 'middle' }
    };

    worksheet.columns = [
      { header: 'Data', key: 'data', width: 12 },
      { header: 'Turno', key: 'turno', width: 10 },
      { header: 'Local', key: 'local', width: 25 },
      { header: 'TST', key: 'tst', width: 12 },
      { header: 'DDS Tema', key: 'dds', width: 30 },
      { header: 'Atividades', key: 'atividades', width: 30 },
      { header: 'Desvios', key: 'desvios', width: 30 },
      { header: 'Classificação', key: 'classificacao', width: 20 },
      { header: 'Ações', key: 'acoes', width: 30 },
      { header: 'Orientações', key: 'orientacoes', width: 30 },
      { header: 'Ferramentas', key: 'ferramentas', width: 15 },
      { header: 'Qtd Inspeções', key: 'qtdInspecoes', width: 15 },
      { header: 'Qtd Desvios', key: 'qtdDesvios', width: 14 },
      { header: 'Condição', key: 'condicao', width: 12 }
    ];

    // Aplicar estilo aos cabeçalhos
    worksheet.getRow(1).eachCell((cell) => {
      cell.style = headerStyle;
    });

    reports.forEach(report => {
      worksheet.addRow({
        data: report.createdAt?.split('T')[0] || '',
        turno: report.turno || '',
        local: report.local || '',
        tst: report.tstResponsavel || '',
        dds: report.ddsRealizado?.tema || '',
        atividades: (report.atividadesAcompanhadas || []).join(', '),
        desvios: (report.desviosIdentificados || []).join(', '),
        classificacao: `${report.classificacaoDesvios?.leve || 0} leve, ${report.classificacaoDesvios?.moderado || 0} mod, ${report.classificacaoDesvios?.grave || 0} grave`,
        acoes: (report.acoesCorretivas || []).join(', '),
        orientacoes: (report.orientacoes || []).join(', '),
        ferramentas: `PARE:${report.ferramentasSeguranca?.pare || 'N'} RQA:${report.ferramentasSeguranca?.rqa || 'N'} VFL:${report.ferramentasSeguranca?.vfl || 'N'}`,
        qtdInspecoes: report.indicadores?.quantidadeInspecoes || 0,
        qtdDesvios: report.indicadores?.quantidadeDesvios || 0,
        condicao: report.condicaoGeralArea || ''
      });
    });

    // Adicionar formatação condicional para condição
    // (simplificado)

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=relatorios_seguranca.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
};