// scripts/noticias.js
import { initAuthListener, login, logout } from './auth.js';
import { getLatestPosts } from './posts.js';
import { initStarRatings } from './ratings.js';
import { handleError } from './ui.js';

const state = {
  page: 1,
  pageSize: 9,
  q: '',
  category: '',
  all: [], // cache da página
};

document.addEventListener('DOMContentLoaded', () => {
  initAuthListener(onAuthChange);
  wireUI();
  loadAndRender(); // carrega primeira leva
});

function onAuthChange(user) {
  const btn = document.getElementById('logoutBtn');
  if (user) btn?.classList.remove('d-none'); else btn?.classList.add('d-none');
}

function wireUI() {
  // login
  document.getElementById('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.querySelector('#email').value;
    const password = document.querySelector('#password').value;
    try { await login(email, password); } catch {}
  });
  document.getElementById('logoutBtn')?.addEventListener('click', logout);

  // filtros
  document.getElementById('applyFilters').addEventListener('click', () => {
    state.q = document.getElementById('q').value.trim().toLowerCase();
    state.category = document.getElementById('category').value;
    state.page = 1;
    render();
  });

  // paginação
  document.getElementById('prevPage').addEventListener('click', () => {
    if (state.page > 1) { state.page--; render(); }
  });
  document.getElementById('nextPage').addEventListener('click', () => {
    const total = filtered().length;
    const lastPage = Math.max(1, Math.ceil(total / state.pageSize));
    if (state.page < lastPage) { state.page++; render(); }
  });

  // page size
  document.getElementById('pageSize').addEventListener('change', (e) => {
    state.pageSize = parseInt(e.target.value, 10);
    state.page = 1;
    render();
  });
}

async function loadAndRender() {
  const grid = document.getElementById('postsGrid');
  grid.innerHTML = skeletons(9);
  try {
    // Pega 50 últimas; a filtragem/paginação é local para simplicidade
    state.all = await getLatestPosts(50);
  } catch (err) {
    handleError(err, 'noticias.load');
    state.all = [];
  }
  render();
}

function filtered() {
  return state.all.filter(p => {
    const hay = [p.title, p.content, p.author].join(' ').toLowerCase();
    const matchQ = !state.q || hay.includes(state.q);
    const matchCat = !state.category || (p.category === state.category);
    return matchQ && matchCat;
  });
}

function render() {
  const items = filtered();
  const total = items.length;
  const start = (state.page - 1) * state.pageSize;
  const slice = items.slice(start, start + state.pageSize);

  // info + paginação
  document.getElementById('countInfo').textContent = `${total} resultado(s)`;
  const lastPage = Math.max(1, Math.ceil(total / state.pageSize));
  document.getElementById('pageLabel').textContent = `Página ${state.page} de ${lastPage}`;
  document.getElementById('prevPage').disabled = state.page <= 1;
  document.getElementById('nextPage').disabled = state.page >= lastPage;

  // render cards
  const grid = document.getElementById('postsGrid');
  if (slice.length === 0) {
    grid.innerHTML = `<div class="col-12 text-center text-muted py-5">Nada encontrado com esses filtros.</div>`;
    return;
  }

  grid.innerHTML = slice.map(cardHTML).join('');

  // ativar estrelas em cada card
  document.querySelectorAll('.rating-container').forEach(initStarRatings);
}

function cardHTML(p) {
  const img = p.imageUrl
    ? `<img src="${p.imageUrl}" class="card-img-top" alt="${escapeHTML(p.title)}" loading="lazy">`
    : '';
  const date = p.createdAt?.toDate ? p.createdAt.toDate().toLocaleDateString('pt-BR') : '';
  const cat = p.category ? `<span class="badge bg-secondary me-2">${escapeHTML(p.category)}</span>` : '';
  return `
    <div class="col-md-6 col-xl-4">
      <article class="card h-100 shadow-sm">
        ${img}
        <div class="card-body d-flex flex-column">
          <h6 class="text-muted small mb-1">${cat}${escapeHTML(p.author || '')} ${date ? '• ' + date : ''}</h6>
          <h5 class="card-title">${escapeHTML(p.title)}</h5>
          <p class="card-text mb-3">${escapeHTML((p.content || '').slice(0, 140))}…</p>
          <div class="mt-auto d-flex justify-content-between align-items-center">
            <a class="btn btn-sm btn-outline-primary" href="post.html?id=${p.id}">
              Ler mais
            </a>
            <div class="rating-container" data-post-id="${p.id}">
              <div class="stars">
                ${[1,2,3,4,5].map(v => `<span class="star" data-value="${v}">★</span>`).join('')}
              </div>
              <span class="average-rating">${p.averageRating?.toFixed?.(1) ?? '0.0'}</span>
            </div>
          </div>
        </div>
      </article>
    </div>
  `;
}

function skeletons(n) {
  return Array.from({ length: n }).map(() => `
    <div class="col-md-6 col-xl-4">
      <div class="card h-100">
        <div class="post-placeholder" style="height:160px;"></div>
        <div class="card-body">
          <div class="post-placeholder" style="height:16px; width:70%; margin-bottom:8px;"></div>
          <div class="post-placeholder" style="height:14px; width:100%; margin-bottom:6px;"></div>
          <div class="post-placeholder" style="height:14px; width:90%;"></div>
        </div>
      </div>
    </div>
  `).join('');
}

function escapeHTML(s = '') {
  return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
}