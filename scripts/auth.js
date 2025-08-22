import { showToast, handleError } from './ui.js';
import { auth, db } from './firebase-config.js'; // Arquivo com a configuração do Firebase

// =============================================
// FUNÇÕES PRINCIPAIS
// =============================================

/**
 * Faz login com e-mail institucional e senha
 * @param {string} email - E-mail do professor (@prof.educacao.sp.gov.br)
 * @param {string} password - Senha
 * @returns {Promise<UserCredential>}
 */
export async function login(email, password) {
    try {
        // Validação do e-mail institucional
        if (!email.endsWith('@prof.educacao.sp.gov.br')) {
            throw new Error('Apenas e-mails institucionais são permitidos.');
        }

        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        
        // Verifica se o e-mail foi confirmado
        if (!userCredential.user.emailVerified) {
            await auth.signOut();
            throw new Error('Verifique seu e-mail para ativar a conta.');
        }

        showToast('Login realizado!', 'success');
        return userCredential;
    } catch (error) {
        handleError(error, 'login');
        throw error; // Rejeita a Promise para tratamento adicional
    }
}

/**
 * Faz logout do usuário
 */
export async function logout() {
    try {
        await auth.signOut();
        showToast('Logout realizado.', 'info');
    } catch (error) {
        handleError(error, 'logout');
    }
}

/**
 * Verifica permissões do usuário (admin/autor)
 * @param {User} user - Objeto do usuário do Firebase
 * @returns {Promise<{isAdmin: boolean}>}
 */
export async function checkUserPermissions(user) {
    try {
        const userDoc = await db.collection('users').doc(user.email).get();
        
        if (userDoc.exists) {
            return userDoc.data();
        } else {
            // Cria registro padrão para novos usuários
            await db.collection('users').doc(user.email).set({
                isAdmin: false,
                name: user.email.split('@')[0]
            });
            return { isAdmin: false };
        }
    } catch (error) {
        handleError(error, 'checkPermissions');
        return { isAdmin: false };
    }
}

/**
 * Registra um novo usuário no Firestore
 * @param {Object} user - Objeto com informações do usuário
 * @param {string} user.email - E-mail do usuário
 * @param {string} user.name - Nome do usuário
 */
export async function registerUser(user) {
    // Garante que o primeiro cadastro nunca seja admin
    await db.collection('users').doc(user.email).set({
        isAdmin: false,
        name: user.email.split('@')[0]
    });
}

// =============================================
// OBSERVADOR DE AUTENTICAÇÃO (GLOBAL)
// =============================================

/**
 * Monitora estado de autenticação e atualiza a UI
 * @param {Function} callback - Função chamada quando o estado muda
 */
export function initAuthListener(callback) {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            try {
                const permissions = await checkUserPermissions(user);
                callback({ user, ...permissions });
            } catch (error) {
                callback(null);
            }
        } else {
            callback(null);
        }
    });
}

// =============================================
// FUNÇÕES AUXILIARES
// =============================================

/**
 * Envia e-mail de redefinição de senha
 * @param {string} email - E-mail institucional
 */
export async function sendPasswordResetEmail(email) {
    try {
        await auth.sendPasswordResetEmail(email);
        showToast('E-mail de redefinição enviado!', 'info');
    } catch (error) {
        handleError(error, 'passwordReset');
    }
}