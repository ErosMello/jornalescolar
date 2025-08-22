import { handleError, showToast } from './ui.js';
import { db, auth } from './firebase-config.js';

// =============================================
// CONSTANTES E CACHE LOCAL
// =============================================
const LOCAL_STORAGE_PREFIX = 'jornal_rating_';

// =============================================
// FUNÇÕES PRINCIPAIS
// =============================================

/**
 * Salva uma avaliação (local + Firebase se logado)
 * @param {string} postId - ID da notícia
 * @param {number} value - Valor da avaliação (1-5)
 */
export async function saveRating(postId, value) {
    try {
        // 1. Salva localmente para resposta imediata
        localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${postId}`, value.toString());
        
        // 2. Tenta salvar no Firebase se usuário estiver logado
        if (auth.currentUser) {
            await db.collection('ratings').doc(`${postId}_${auth.currentUser.uid}`).set({
                postId,
                userId: auth.currentUser.uid,
                value,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        
        showToast('Avaliação salva!', 'success');
    } catch (error) {
        handleError(error, 'saveRating');
    }
}

/**
 * Busca a avaliação do usuário atual (local ou Firebase)
 * @param {string} postId 
 * @returns {Promise<number|null>} Valor da avaliação (1-5) ou null
 */
export async function getUserRating(postId) {
    // 1. Verifica no localStorage
    const localRating = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${postId}`);
    if (localRating) return parseInt(localRating);
    
    // 2. Busca no Firebase (se logado)
    if (auth.currentUser) {
        try {
            const doc = await db.collection('ratings')
                .doc(`${postId}_${auth.currentUser.uid}`)
                .get();
                
            return doc.exists ? doc.data().value : null;
        } catch (error) {
            handleError(error, 'getUserRating');
        }
    }
    
    return null;
}

/**
 * Calcula a média de avaliações de um post
 * @param {string} postId 
 * @returns {Promise<{average: number, count: number}>}
 */
export async function getPostAverageRating(postId) {
    try {
        // 1. Busca avaliações no Firebase
        const snapshot = await db.collection('ratings')
            .where('postId', '==', postId)
            .get();
        
        // 2. Calcula média
        const ratings = snapshot.docs.map(doc => doc.data().value);
        const count = ratings.length;
        const average = count > 0 
            ? parseFloat((ratings.reduce((a, b) => a + b, 0) / count).toFixed(1))
            : 0;
            
        return { average, count };
    } catch (error) {
        handleError(error, 'getPostAverageRating');
        return { average: 0, count: 0 };
    }
}

/**
 * Cria uma nova avaliação no Firebase
 * @param {Object} param0 - Parâmetros da avaliação
 * @param {string} param0.postId - ID da notícia
 * @param {number} param0.value - Valor da avaliação (1-5)
 */
export async function createRating({ postId, value }) {
    await db.collection('ratings').add({
        postId,
        userId: auth.currentUser.uid,
        value,
        timestamp: new Date()
    });
}

// =============================================
// FUNÇÕES DE UI (INTEGRAÇÃO COM HTML)
// =============================================

/**
 * Inicializa listeners para estrelas em um container
 * @param {HTMLElement} container - Elemento pai (.rating-container)
 */
export function initStarRatings(container) {
    // 1. Configura hover
    container.querySelectorAll('.star').forEach(star => {
        star.addEventListener('mouseover', (e) => {
            const value = parseInt(e.target.dataset.value);
            highlightStars(container, value);
        });
    });
    
    // 2. Configura clique
    container.addEventListener('click', (e) => {
        if (e.target.classList.contains('star')) {
            const postId = container.dataset.postId;
            const value = parseInt(e.target.dataset.value);
            saveRating(postId, value)
                .then(() => updateStarsUI(container));
        }
    });
    
    // 3. Carrega avaliação existente
    loadSavedRating(container);
}

/**
 * Atualiza a UI das estrelas após avaliação
 * @param {HTMLElement} container 
 */
async function updateStarsUI(container) {
    const postId = container.dataset.postId;
    
    // 1. Atualiza estrelas do usuário
    const userRating = await getUserRating(postId);
    if (userRating) highlightStars(container, userRating);
    
    // 2. Atualiza média geral
    const { average } = await getPostAverageRating(postId);
    container.querySelector('.average-rating').textContent = average.toFixed(1);
}

// =============================================
// FUNÇÕES AUXILIARES (PRIVADAS)
// =============================================

/**
 * Destaca estrelas até o valor selecionado
 * @param {HTMLElement} container 
 * @param {number} value - Número de estrelas (1-5)
 */
function highlightStars(container, value) {
    container.querySelectorAll('.star').forEach((star, index) => {
        star.classList.toggle('active', index < value);
    });
}

/**
 * Carrega avaliação salva ao iniciar
 * @param {HTMLElement} container 
 */
async function loadSavedRating(container) {
    const postId = container.dataset.postId;
    const userRating = await getUserRating(postId);
    
    if (userRating) {
        highlightStars(container, userRating);
    }
    
    // Mostra média geral
    const { average } = await getPostAverageRating(postId);
    container.querySelector('.average-rating').textContent = average.toFixed(1);
}