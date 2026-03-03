// Toast + Confirm UI utilities (no browser alerts/confirm)

function getToastContainer() {
    let container = document.getElementById('toastContainer');
    if (!container) {
        // Create a container if it doesn't exist
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'fixed top-20 right-8 z-50 space-y-3';
        document.body.appendChild(container);
    }
    return container;
}

// Toast notification system
function showToast(message, type = 'info') {
    const container = getToastContainer();
    
    const toast = document.createElement('div');
    const toastId = 'toast-' + Date.now();
    toast.id = toastId;
    
    // Type-based styling
    const typeStyles = {
        success: {
            bg: 'bg-green-50',
            border: 'border-green-200',
            text: 'text-green-800',
            icon: '✓'
        },
        error: {
            bg: 'bg-red-50',
            border: 'border-red-200',
            text: 'text-red-800',
            icon: '✕'
        },
        warning: {
            bg: 'bg-yellow-50',
            border: 'border-yellow-200',
            text: 'text-yellow-800',
            icon: '⚠'
        },
        info: {
            bg: 'bg-blue-50',
            border: 'border-blue-200',
            text: 'text-blue-800',
            icon: 'ℹ'
        }
    };
    
    const style = typeStyles[type] || typeStyles.info;
    
    toast.className = `${style.bg} ${style.border} ${style.text} border rounded-lg shadow-md px-4 py-3 flex items-center justify-between min-w-[300px] max-w-md transform transition-all duration-300 ease-in-out opacity-0 translate-x-full`;
    
    toast.innerHTML = `
        <div class="flex items-center gap-3">
            <span class="text-lg font-semibold">${style.icon}</span>
            <span class="text-sm font-medium">${message}</span>
        </div>
        <button onclick="closeToast('${toastId}')" class="text-current opacity-60 hover:opacity-100 ml-4">
            <span class="text-lg">&times;</span>
        </button>
    `;
    
    container.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => {
        toast.classList.remove('opacity-0', 'translate-x-full');
        toast.classList.add('opacity-100', 'translate-x-0');
    }, 10);
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
        closeToast(toastId);
    }, 4000);
}

function closeToast(toastId) {
    const toast = document.getElementById(toastId);
    if (!toast) return;
    
    toast.classList.remove('opacity-100', 'translate-x-0');
    toast.classList.add('opacity-0', 'translate-x-full');
    
    setTimeout(() => {
        toast.remove();
    }, 300);
}

// Convenience functions
function showSuccess(message) {
    showToast(message, 'success');
}

function showError(message) {
    showToast(message, 'error');
}

function showWarning(message) {
    showToast(message, 'warning');
}

function showInfo(message) {
    showToast(message, 'info');
}

// Simple confirm modal (returns a Promise<boolean>)
let activeConfirm = null;

function showConfirm(message, options = {}) {
    const {
        title = 'Confirm',
        confirmText = 'OK',
        cancelText = 'Cancel'
    } = options;

    // If another confirm is open, resolve it as false
    if (activeConfirm && activeConfirm.resolve) {
        activeConfirm.resolve(false);
        if (activeConfirm.overlay) {
            activeConfirm.overlay.remove();
        }
    }

    return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 opacity-0 transition-opacity duration-200';

        overlay.innerHTML = `
            <div class="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 transform transition-transform duration-200 scale-95">
                <div class="px-6 py-4 border-b border-neutral-200">
                    <h3 class="text-sm font-medium tracking-wide text-text-dark uppercase">${title}</h3>
                </div>
                <div class="px-6 py-4">
                    <p class="text-sm text-text-dark leading-relaxed">${message}</p>
                </div>
                <div class="px-6 py-4 border-t border-neutral-200 flex justify-end gap-3">
                    <button type="button" data-confirm-cancel
                        class="px-5 py-2 rounded-full border border-gray-300 text-xs tracking-wide uppercase text-text-dark hover:bg-gray-50 transition-all duration-150">
                        ${cancelText}
                    </button>
                    <button type="button" data-confirm-ok
                        class="px-5 py-2 rounded-full bg-brand text-white text-xs tracking-wide uppercase hover:bg-brand-accent transition-all duration-150">
                        ${confirmText}
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Animate in
        requestAnimationFrame(() => {
            overlay.classList.remove('opacity-0');
            overlay.classList.add('opacity-100');
            const card = overlay.querySelector('div');
            if (card) {
                card.classList.remove('scale-95');
                card.classList.add('scale-100');
            }
        });

        const cleanup = (value) => {
            overlay.classList.remove('opacity-100');
            overlay.classList.add('opacity-0');
            const card = overlay.querySelector('div');
            if (card) {
                card.classList.remove('scale-100');
                card.classList.add('scale-95');
            }
            setTimeout(() => overlay.remove(), 180);
            activeConfirm = null;
            resolve(value);
        };

        const okBtn = overlay.querySelector('[data-confirm-ok]');
        const cancelBtn = overlay.querySelector('[data-confirm-cancel]');

        okBtn.addEventListener('click', () => cleanup(true));
        cancelBtn.addEventListener('click', () => cleanup(false));
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) cleanup(false);
        });

        activeConfirm = { overlay, resolve };
    });
}
