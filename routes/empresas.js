// routes/empresas.js
import express from 'express';
import { db } from '../services/firebaseAdmin.js';
import { autenticarUsuario } from '../middleware/planejamentoAuth.js';
import { setEmpresaContext } from '../middleware/empresaMiddleware.js';

const router = express.Router();

// ============================
// TODAS AS ROTAS EXIGEM AUTENTICAÇÃO
// ============================
router.use(autenticarUsuario);

// ============================
// ROTA: LISTAR EMPRESAS DO USUÁRIO
// NÃO precisa de contexto de empresa (x-empresa-id)
// ============================
router.get('/usuario/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    console.log(`🔍 Buscando empresas para o usuário: ${uid}`);
    
    // Busca as empresas vinculadas ao usuário na subcoleção 'empresas'
    const snapshot = await db.collection('usuarios').doc(uid).collection('empresas').get();
    const empresas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    console.log(`📋 ${empresas.length} empresas encontradas para o usuário`);
    res.json(empresas);
  } catch (error) {
    console.error('❌ Erro ao listar empresas do usuário:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ============================
// ROTAS QUE PRECISAM DE CONTEXTO DE EMPRESA
// (a partir daqui, exige x-empresa-id)
// ============================
router.use(setEmpresaContext);

// ============================
// ROTA: BUSCAR EMPRESA POR ID
// GET /api/empresas/:id
// ============================
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔍 Buscando empresa por ID: ${id}`);
    
    const doc = await db.collection('empresas').doc(id).get();
    if (!doc.exists) {
      return res.status(404).json({ 
        success: false, 
        error: 'Empresa não encontrada' 
      });
    }
    
    const empresa = { id: doc.id, ...doc.data() };
    console.log(`✅ Empresa encontrada: ${empresa.nome}`);
    res.json(empresa);
  } catch (error) {
    console.error('❌ Erro ao buscar empresa:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ============================
// ROTA: CRIAR EMPRESA (APENAS ADMIN)
// POST /api/empresas
// ============================
router.post('/', async (req, res) => {
  try {
    const { nome, dominio, cores, logo } = req.body;
    
    // Validações básicas
    if (!nome || !dominio) {
      return res.status(400).json({ 
        success: false, 
        error: 'Nome e domínio são obrigatórios' 
      });
    }
    
    console.log(`📝 Criando nova empresa: ${nome}`);
    
    const empresaData = {
      nome,
      dominio,
      cores: cores || {},
      logo: logo || null,
      ativo: true,
      createdAt: new Date().toISOString(),
    };
    
    const docRef = await db.collection('empresas').add(empresaData);
    console.log(`✅ Empresa criada com ID: ${docRef.id}`);
    
    res.status(201).json({ 
      success: true, 
      id: docRef.id, 
      data: { id: docRef.id, ...empresaData },
      message: 'Empresa criada com sucesso!' 
    });
  } catch (error) {
    console.error('❌ Erro ao criar empresa:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ============================
// ROTA: ATUALIZAR EMPRESA (APENAS ADMIN)
// PUT /api/empresas/:id
// ============================
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, dominio, cores, logo, ativo } = req.body;
    
    console.log(`📝 Atualizando empresa: ${id}`);
    
    const empresaRef = db.collection('empresas').doc(id);
    const doc = await empresaRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({ 
        success: false, 
        error: 'Empresa não encontrada' 
      });
    }
    
    const updateData = {};
    if (nome !== undefined) updateData.nome = nome;
    if (dominio !== undefined) updateData.dominio = dominio;
    if (cores !== undefined) updateData.cores = cores;
    if (logo !== undefined) updateData.logo = logo;
    if (ativo !== undefined) updateData.ativo = ativo;
    updateData.updatedAt = new Date().toISOString();
    
    await empresaRef.update(updateData);
    console.log(`✅ Empresa ${id} atualizada com sucesso`);
    
    res.json({ 
      success: true, 
      message: 'Empresa atualizada com sucesso!' 
    });
  } catch (error) {
    console.error('❌ Erro ao atualizar empresa:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ============================
// ROTA: EXCLUIR EMPRESA (APENAS ADMIN)
// DELETE /api/empresas/:id
// ============================
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`🗑️ Excluindo empresa: ${id}`);
    
    const empresaRef = db.collection('empresas').doc(id);
    const doc = await empresaRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({ 
        success: false, 
        error: 'Empresa não encontrada' 
      });
    }
    
    await empresaRef.delete();
    console.log(`✅ Empresa ${id} excluída com sucesso`);
    
    res.json({ 
      success: true, 
      message: 'Empresa excluída com sucesso!' 
    });
  } catch (error) {
    console.error('❌ Erro ao excluir empresa:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

export default router;