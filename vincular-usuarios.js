// scripts/vincular-usuario.js
import { db } from './services/firebaseAdmin.js';

const uid = '4ytuc6ewxuOgIdz7v8pOwVPUfRu1';
const empresaId = 'gama';

async function vincular() {
  await db.collection('usuarios').doc(uid).collection('empresas').doc(empresaId).set({
    nome: 'GAMA Eletrocomunicações',
    dominio: 'gama.com',
    ativo: true,
    vinculadoEm: new Date().toISOString()
  });
  console.log('✅ Usuário vinculado à GAMA!');
}

vincular();