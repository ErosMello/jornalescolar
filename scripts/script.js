/*
// Sistema de Estrelas (idêntico ao anterior)
document.querySelectorAll('.star').forEach(star => {
    star.addEventListener('mouseover', () => {
        const ratingBox = star.closest('.rating');
        const value = parseInt(star.getAttribute('data-value'));
        highlightStars(ratingBox, value);
    });

    star.addEventListener('click', () => {
        const ratingBox = star.closest('.rating');
        const postId = ratingBox.getAttribute('data-post-id');
        const value = parseInt(star.getAttribute('data-value'));

        saveRating(postId, value);
        updateAverage(ratingBox);
    });
});

// Funções auxiliares (highlightStars, saveRating, updateAverage) mantidas iguais

// Fecha modal ao clicar fora (mobile)
document.getElementById('loginModal').addEventListener('click', function (e) {
    if (e.target === this) {
        const modal = bootstrap.Modal.getInstance(this);
        modal.hide();
    }
});

// script.js - Validação do formato de e-mail
document.getElementById('loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const email = document.getElementById('email').value;

    if (!email.endsWith('@prof.educacao.sp.gov.br')) {
        alert('Apenas e-mails institucionais são permitidos');
        return;
    }

    // Verificação adicional com Firebase Auth
    firebase.auth().signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            if (!userCredential.user.emailVerified) {
                alert('Verifique seu e-mail para completar o cadastro');
                firebase.auth().signOut();
                return;
            }
            checkUserPermissions(userCredential.user);
        });
});

function showEditButtons() {
    const currentUser = firebase.auth().currentUser;
    const isAuthor = post.author === currentUser.email;
    const isAdmin = currentUser.email === "erosmatheus@prof.educacao.sp.gov.br" ||
        (userDoc && userDoc.data().isAdmin);

    if (isAuthor || isAdmin) {
        document.querySelector('.edit-buttons').style.display = 'block';
    }
}

const firebaseConfig = {
    apiKey: "SUA_API_KEY",
    authDomain: "SEU_PROJETO.firebaseapp.com",
    projectId: "SEU_PROJETO",
    storageBucket: "SEU_PROJETO.appspot.com"
};
firebase.initializeApp(firebaseConfig);

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    // Mostra o toast
    setTimeout(() => toast.style.opacity = 1, 100);

    // Remove após 5 segundos
    setTimeout(() => {
        toast.style.opacity = 0;
        setTimeout(() => toast.remove(), 500);
    }, 5000);
}

// Função para mostrar/ocultar loading
function showLoading(container) {
    const spinner = document.createElement('div');
    spinner.className = 'loading-spinner';
    container.appendChild(spinner);
    return spinner;
}

function hideLoading(spinner) {
    spinner.remove();
}

// Exemplo de uso:
const spinner = showLoading(document.getElementById('form-container'));
// Após operação assíncrona:
hideLoading(spinner);

function setupLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (!logoutBtn) return;

    logoutBtn.addEventListener('click', async () => {
        try {
            await auth.signOut();
            showToast('Logout realizado com sucesso', 'success');
            logoutBtn.classList.add('d-none');
            // Atualize a UI conforme necessário
        } catch (error) {
            showToast('Erro ao fazer logout', 'error');
        }
    });
}

// Modifique onAuthStateChanged para mostrar/ocultar o botão
auth.onAuthStateChanged(user => {
    const logoutBtn = document.getElementById('logoutBtn');
    if (user) {
        logoutBtn?.classList.remove('d-none');
        checkUserPermissions(user);
    } else {
        logoutBtn?.classList.add('d-none');
    }
});

async function uploadImage(file) {
    if (!file) return null;

    try {
        const storageRef = storage.ref(`posts/${Date.now()}_${file.name}`);
        const uploadTask = storageRef.put(file);

        return new Promise((resolve, reject) => {
            uploadTask.on('state_changed',
                null,
                (error) => reject(error),
                async () => resolve(await uploadTask.snapshot.ref.getDownloadURL())
            );
        });
    } catch (error) {
        showToast('Erro ao enviar imagem', 'error');
        console.error("Upload error:", error);
        return null;
    }
}

// Modifique sua função createPost
async function createPost(title, content, imageFile) {
    const spinner = showLoading(document.getElementById('post-container'));

    try {
        const imageUrl = await uploadImage(imageFile);

        await db.collection('posts').add({
            title,
            content,
            imageUrl: imageUrl || '',
            author: auth.currentUser.email,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        showToast('Post criado com sucesso!', 'success');
    } catch (error) {
        showToast('Erro ao criar post', 'error');
        console.error(error);
    } finally {
        hideLoading(spinner);
    }
}

// Sistema de Estrelas com Firebase + LocalStorage
async function saveRating(postId, value) {
    // Salva localmente primeiro para resposta imediata
    const localKey = `rated_${postId}`;
    localStorage.setItem(localKey, value.toString());

    // Tenta salvar no Firebase (se logado)
    if (auth.currentUser) {
        try {
            await db.collection('ratings').doc(`${postId}_${auth.currentUser.email}`).set({
                postId,
                userId: auth.currentUser.email,
                value,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error("Erro ao salvar no Firebase:", error);
        }
    }
}

function updateAverage(ratingBox) {
    const postId = ratingBox.getAttribute('data-post-id');

    // Calcula média local
    const ratings = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith(`rated_`)) {
            ratings.push(parseInt(localStorage.getItem(key)));
        }
    }

    const avg = ratings.length > 0
        ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
        : "0.0";

    ratingBox.querySelector('.average').textContent = `(${avg})`;

    // Atualiza no Firebase (background)
    if (auth.currentUser) {
        updateFirebaseAverage(postId);
    }
}

async function updateFirebaseAverage(postId) {
    // Implementação similar para atualizar a média no Firebase
}

document.addEventListener('DOMContentLoaded', function () {
    // Inicializações
    initializeStarRatings();
    setupAuthForm();
    setupLogout();

    // Verifica autenticação
    auth.onAuthStateChanged(user => {
        if (user) {
            checkUserPermissions(user);
            document.getElementById('logoutBtn')?.classList.remove('d-none');
        }
    });

    // Configura o formulário de posts
    const postForm = document.getElementById('postForm');
    if (postForm) {
        postForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const imageFile = document.getElementById('postImage').files[0];
            await createPost(
                document.getElementById('postTitle').value,
                document.getElementById('postContent').value,
                imageFile
            );
        });
    }
});

// =============================================
// SISTEMA DE AVALIAÇÃO POR ESTRELAS
// =============================================
function initializeStarRatings() {
    document.querySelectorAll('.star').forEach(star => {
        star.addEventListener('mouseover', handleStarHover);
        star.addEventListener('click', handleStarClick);
        star.addEventListener('mouseout', resetStarHover);
    });
}

function handleStarHover(e) {
    const star = e.target;
    const ratingBox = star.closest('.rating');
    const value = parseInt(star.getAttribute('data-value'));
    highlightStars(ratingBox, value);
}

function handleStarClick(e) {
    const star = e.target;
    const ratingBox = star.closest('.rating');
    const postId = ratingBox.getAttribute('data-post-id');
    const value = parseInt(star.getAttribute('data-value'));

    saveRating(postId, value)
        .then(() => updateAverage(ratingBox))
        .catch(error => console.error("Erro ao salvar avaliação:", error));
}

function resetStarHover() {
    // Implemente a lógica para resetar o hover se necessário
}

// =============================================
// AUTENTICAÇÃO DE USUÁRIO
// =============================================
function setupAuthForm() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
}

async function handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (!validateEmail(email)) {
        showAlert('Apenas e-mails institucionais são permitidos (@prof.educacao.sp.gov.br)', 'error');
        return;
    }

    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);

        if (!userCredential.user.emailVerified) {
            await auth.signOut();
            showAlert('Por favor, verifique seu e-mail antes de fazer login', 'warning');
            return;
        }

        await checkUserPermissions(userCredential.user);
        redirectToDashboard();

    } catch (error) {
        handleAuthError(error);
    }
}

function validateEmail(email) {
    return email.endsWith('@prof.educacao.sp.gov.br');
}

// =============================================
// CONTROLE DE PERMISSÕES
// =============================================
async function checkUserPermissions(user) {
    try {
        const userDoc = await db.collection('users').doc(user.email).get();

        if (userDoc.exists) {
            const userData = userDoc.data();
            setupUIForUser(user, userData.isAdmin);
        } else {
            // Primeiro acesso - criar registro do usuário
            await createUserRecord(user);
        }
    } catch (error) {
        console.error("Erro ao verificar permissões:", error);
    }
}

function setupUIForUser(user, isAdmin) {
    if (isAdmin || user.email === "erosmatheus@prof.educacao.sp.gov.br") {
        showAdminControls();
    }
    showEditButtonsForUserPosts(user.email);
}

// =============================================
// FUNÇÕES AUXILIARES
// =============================================
function showAlert(message, type = 'info') {
    // Implemente um sistema de notificação mais sofisticado
    alert(message); // Temporário - substituir por um modal ou toast
}

function handleAuthError(error) {
    let message = '';
    switch (error.code) {
        case 'auth/wrong-password':
            message = 'Senha incorreta';
            break;
        case 'auth/user-not-found':
            message = 'Usuário não encontrado';
            break;
        default:
            message = 'Erro ao fazer login: ' + error.message;
    }
    showAlert(message, 'error');
}

// =============================================
// INICIALIZAÇÃO DA APLICAÇÃO
// =============================================
document.addEventListener('DOMContentLoaded', function () {
    initializeStarRatings();
    setupAuthForm();

    // Verifica se já está autenticado ao carregar a página
    auth.onAuthStateChanged(user => {
        if (user) checkUserPermissions(user);
    });
});
*/