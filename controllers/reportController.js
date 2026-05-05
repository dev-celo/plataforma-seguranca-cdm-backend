import { db } from '../services/firebaseAdmin.js';
import backupService from '../services/backupService.js';

export const createReport = async (req, res, next) => {
  try {
    const reportData = {
      ...req.body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    console.log('📝 Criando relatório:', reportData.data);

    // Salvar no Firestore
    const docRef = await db.collection('reports').add(reportData);
    
    // Backup local
    await backupService.saveBackup(docRef.id, { id: docRef.id, ...reportData });

    res.status(201).json({ 
      success: true, 
      id: docRef.id, 
      message: 'Relatório salvo com sucesso!' 
    });
  } catch (error) {
    console.error('❌ Erro:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

export const getReports = async (req, res, next) => {
  try {
    const { startDate, endDate, tst, limit = 100 } = req.query;
    
    let query = db.collection('reports').orderBy('createdAt', 'desc');
    
    if (startDate) query = query.where('createdAt', '>=', startDate);
    if (endDate) query = query.where('createdAt', '<=', endDate);
    if (tst && tst !== 'Todos') query = query.where('tstResponsavel', '==', tst);
    
    const snapshot = await query.limit(parseInt(limit)).get();
    const reports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    res.json({ success: true, data: reports });
  } catch (error) {
    console.error('❌ Erro ao buscar:', error.message);
    res.json({ success: true, data: [] });
  }
};

export const getReportById = async (req, res, next) => {
  try {
    const doc = await db.collection('reports').doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Relatório não encontrado' });
    }
    res.json({ success: true, data: { id: doc.id, ...doc.data() } });
  } catch (error) {
    console.error('❌ Erro:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};