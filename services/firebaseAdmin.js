import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let db;
let auth;

const initializeFirebase = async () => {
  try {
    let serviceAccount;
    
    // 🔥 PRODUÇÃO (Render): lê da variável de ambiente
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      console.log('📁 Carregando Service Account da variável de ambiente...');
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      console.log(`✅ Service Account carregada. Project ID: ${serviceAccount.project_id}`);
    } 
    // 💻 DESENVOLVIMENTO LOCAL: lê do arquivo
    else {
      const serviceAccountPath = join(__dirname, '../firebase-service-account.json');
      console.log(`📁 Procurando service account em: ${serviceAccountPath}`);
      serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
      console.log(`✅ Service Account carregada do arquivo. Project ID: ${serviceAccount.project_id}`);
    }

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id,
      });
      console.log('✅ Firebase Admin inicializado');
    }

    db = admin.firestore();
    auth = admin.auth();
    
    // 🔥 TESTE DE CONEXÃO (opcional - pode remover em produção)
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔄 Testando conexão com Firestore...');
      const testRef = db.collection('_test_connection').doc('test');
      await testRef.set({ timestamp: new Date().toISOString(), test: true });
      console.log('✅ Conexão com Firestore funcionando!');
      await testRef.delete();
      console.log('✅ Teste concluído!');
    } else {
      console.log('✅ Firestore conectado (modo produção)');
    }
    
  } catch (error) {
    console.error('❌ Erro ao inicializar Firebase Admin:', error.message);
    
    // Em produção, não derruba o servidor se o Firebase falhar?
    // Depende da sua necessidade. Por segurança, vamos deixar derrubar.
    if (process.env.NODE_ENV === 'production') {
      console.error('🚨 Falha crítica. Encerrando...');
      process.exit(1);
    }
  }
};

// Executa a inicialização
await initializeFirebase();

export { db, auth };