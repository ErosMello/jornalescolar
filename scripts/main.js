// =============================================
// IMPORTAÇÕES
// =============================================
import { initAuthListener, login, logout } from './auth.js';
import { createPost, getLatestPosts } from './posts.js';
import { initStarRatings, saveRating } from './ratings.js';
import { handleError, showToast } from './ui.js';
import { auth } from './firebase-config.js';

// =============================================
// CONSTANTES
// =============================================
const USE_MOCKS = true; // Altere para true em desenvolvimento sem Firebase

// =============================================
// INICIALIZAÇÃO GERAL (on DOM Load)
// =============================================
document.addEventListener('DOMContentLoaded', () => {
    initAuthListener(handleAuthStateChange);
    setupLoginForm();
    setupLogoutButton();
    setupPostForm();
    loadInitialContent();
});

document.addEventListener('DOMContentLoaded', function() {
    const logoutBtn = document.getElementById('logoutBtn');

    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            logoutBtn.classList.add('d-none');
            alert('Logout realizado!');
            // Aqui você pode ocultar menus/páginas restritas
        });
    }
});

// =============================================
// GERENCIAMENTO DE AUTENTICAÇÃO
// =============================================
function handleAuthStateChange(user) {
    if (user) {
        // Usuário autenticado
        toggleElement('#admin-section', true);
        toggleElement('#logoutBtn', true);
    } else {
        // Usuário não autenticado
        toggleElement('#admin-section', false);
        toggleElement('#logoutBtn', false);
    }
}

function setupLoginForm() {
    const form = document.getElementById('login-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = form.querySelector('#email').value;
        const password = form.querySelector('#password').value;

        try {
            await login(email, password);
            form.reset();
        } catch (error) {
            // Erro já tratado em auth.js
        }
    });
}

function setupLogoutButton() {
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
}

// =============================================
// GERENCIAMENTO DE POSTS
// =============================================
function setupPostForm() {
    const form = document.getElementById('post-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const postData = {
            title: form.querySelector('#post-title').value,
            content: form.querySelector('#post-content').value,
            imageFile: form.querySelector('#post-image').files[0]
        };

        try {
            await createPost(
                postData.title, 
                postData.content, 
                postData.imageFile, 
                auth.currentUser.email
            );
            form.reset();
            loadInitialContent();
        } catch (error) {
            // Erro já tratado em posts.js
        }
    });
}

async function loadInitialContent() {
    const postsContainer = document.getElementById('posts-container');
    if (!postsContainer) return;

    showLoading(postsContainer);

    try {
        const posts = USE_MOCKS ? getMockPosts() : await getLatestPosts();
        renderPosts(posts.length > 0 ? posts : getMockPosts());
    } catch (error) {
        handleError(error, 'loadInitialContent');
        renderPosts(getMockPosts());
    }
}

function renderPosts(posts) {
    const postsContainer = document.getElementById('posts-container');
    
    postsContainer.innerHTML = posts.length > 0 
        ? posts.map(postToHTML).join('')
        : '<p class="text-muted">Nenhuma notícia encontrada.</p>';

    initAllStarRatings();
}

function postToHTML(post) {
    return `
        <article class="post" data-post-id="${post.id}">
            <h3>${post.title}</h3>
            ${post.imageUrl ? `<img src="${post.imageUrl}" alt="${post.title}" class="post-image">` : ''}
            <p>${post.content}</p>
            <div class="rating-container" data-post-id="${post.id}">
                <div class="stars">
                    ${[1, 2, 3, 4, 5].map(v => `<span class="star" data-value="${v}">★</span>`).join('')}
                </div>
                <span class="average-rating">${post.averageRating?.toFixed(1) || '0.0'}</span>
            </div>
        </article>
    `;
}

// =============================================
// SISTEMA DE AVALIAÇÕES
// =============================================
function initAllStarRatings() {
    document.querySelectorAll('.rating-container').forEach(container => {
        initStarRatings(container);
    });

    // Listener global para estrelas (funciona mesmo em posts dinâmicos)
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('star')) {
            const container = e.target.closest('.rating-container');
            if (container) {
                const postId = container.dataset.postId;
                const value = parseInt(e.target.dataset.value);
                saveRating(postId, value);
            }
        }
    });
}

// =============================================
// MOCKUPS (Dados de teste)
// =============================================
function getMockPosts() {
    return [
        {
            id: 'mock-1',
            title: 'Feira de Ciências 2023 - Exemplo',
            content: 'Este é um post de teste. Quando o Firestore tiver dados reais, eles serão carregados automaticamente.',
            imageUrl: 'https://via.placeholder.com/600x400?text=Imagem+Exemplo',
            author: 'professor@escola.edu.br',
            createdAt: new Date().toISOString(),
            averageRating: 3.5
        },
        {
            id: 'mock-2',
            title: 'Reunião de Pais - Exemplo',
            content: 'Data: 20/10/2023. Local: Auditório da escola.',
            imageUrl: '',
            author: 'direcao@escola.edu.br',
            createdAt: new Date(Date.now() - 86400000).toISOString(), // Ontem
            averageRating: 4.2
        }
    ];
}

// =============================================
// FUNÇÕES AUXILIARES
// =============================================
function toggleElement(selector, show) {
    const el = document.querySelector(selector);
    if (!el) return;
    if (show) {
        el.classList.remove('d-none');
    } else {
        el.classList.add('d-none');
    }
}

function showLoading(container) {
    const loader = document.createElement('div');
    loader.className = 'loading-spinner';
    container.innerHTML = '';
    container.appendChild(loader);
    return loader;
}