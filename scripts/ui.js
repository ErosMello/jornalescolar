export function handleError(error, context = 'global') {
    console.error(`[${context}]`, error);
    showToast(`Erro: ${error.message}`, 'error');
    // Opcional: enviar para um serviço como Sentry
}

export function showLoading(container) {
    const spinner = document.createElement('div');
    spinner.className = 'spinner';
    container.appendChild(spinner);
    return spinner;
}