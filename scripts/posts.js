import { handleError, showToast, showLoading, hideLoading } from './ui.js';
import { db, auth } from './firebase-config.js';

// =============================================
// FUNÇÕES PRINCIPAIS
// =============================================

/**
 * Cria um novo post no Firestore
 * @param {string} title - Título da notícia
 * @param {string} content - Conteúdo da notícia
 * @param {File} imageFile - Imagem opcional
 * @param {string} author - E-mail do autor (pego do Firebase Auth)
 * @returns {Promise<string>} ID do post criado
 */
export async function createPost(title, content, imageFile = null, author) {
    const spinner = showLoading(document.getElementById('posts-container'));

    try {
        // 1. Faz upload da imagem (se existir)
        const imageUrl = imageFile ? await uploadImage(imageFile) : null;

        // 2. Salva no Firestore
        const postRef = await db.collection('posts').add({
            title,
            content,
            imageUrl,
            author: auth.currentUser.email, // sempre pega do usuário logado
            createdAt: new Date(),
            updatedAt: new Date(),
            isPublished: false // Pode ser usado para rascunhos
        });

        showToast('Notícia publicada com sucesso!', 'success');
        return postRef.id;

    } catch (error) {
        handleError(error, 'createPost');
        throw error;
    } finally {
        hideLoading(spinner);
    }
}

/**
 * Atualiza um post existente
 * @param {string} postId - ID do post
 * @param {Object} data - Dados atualizados {title, content, imageFile?}
 */
export async function updatePost(postId, { title, content, imageFile }) {
    try {
        const updateData = { 
            title, 
            content,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (imageFile) {
            updateData.imageUrl = await uploadImage(imageFile);
        }

        await db.collection('posts').doc(postId).update(updateData);
        showToast('Notícia atualizada!', 'success');
    } catch (error) {
        handleError(error, 'updatePost');
    }
}

/**
 * Deleta um post (apenas para admins/autores)
 * @param {string} postId - ID do post
 */
export async function deletePost(postId) {
    try {
        await db.collection('posts').doc(postId).delete();
        showToast('Notícia removida.', 'info');
    } catch (error) {
        handleError(error, 'deletePost');
    }
}

// =============================================
// FUNÇÕES DE CONSULTA
// =============================================

/**
 * Busca posts paginados (para a homepage)
 * @param {number} limit - Número de posts por página
 * @returns {Promise<Array>} Lista de posts
 */
export async function getLatestPosts(limit = 10) {
    try {
        const snapshot = await db.collection('posts')
            .where('isPublished', '==', true)
            .orderBy('createdAt', 'desc')
            .limit(limit)
            .get();

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        handleError(error, 'getLatestPosts');
        return [];
    }
}

/**
 * Busca um post específico por ID
 * @param {string} postId 
 * @returns {Promise<Object|null>} Dados do post
 */
export async function getPostById(postId) {
    try {
        const doc = await db.collection('posts').doc(postId).get();
        return doc.exists ? { id: doc.id, ...doc.data() } : null;
    } catch (error) {
        handleError(error, 'getPostById');
        return null;
    }
}

// =============================================
// FUNÇÕES AUXILIARES (PRIVADAS)
// =============================================

/**
 * Faz upload de imagem para o Firebase Storage
 * @param {File} file 
 * @returns {Promise<string>} URL da imagem
 */
async function uploadImage(file) {
    try {
        const imageRef = storage.child(`posts/${Date.now()}_${file.name}`);
        await imageRef.put(file);
        return await imageRef.getDownloadURL();
    } catch (error) {
        handleError(error, 'uploadImage');
        throw new Error('Falha ao enviar imagem');
    }
}