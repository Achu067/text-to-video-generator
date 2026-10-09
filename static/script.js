const textInput = document.getElementById('text');
const charCountDisplay = document.getElementById('char-count');
const videoForm = document.getElementById('video-form');
const generateBtn = document.getElementById('generate-btn');
const statusContainer = document.getElementById('status-container');
const statusMessage = document.getElementById('status-message');
const progressFill = document.querySelector('.progress-fill');
const previewContainer = document.getElementById('preview-container');
const videoPlayer = document.createElement('video');
const resultActions = document.getElementById('result-actions');
const downloadLink = document.getElementById('download-link');
const shareBtn = document.getElementById('share-btn');
const paymentModal = document.getElementById('payment-modal');
const purchaseBtn = document.getElementById('purchase-btn');
const closeModalBtn = document.getElementById('close-modal');
const creditsDisplay = document.getElementById('credits-count');
const loginBtn = document.getElementById('login-btn');
const loginModal = document.getElementById('login-modal');
const closeLoginModal = document.getElementById('close-login-modal');
const loginForm = document.getElementById('login-form');

let currentUserId = null;
let currentVideoFilename = null;

// Update character count
textInput.addEventListener('input', () => {
    charCountDisplay.textContent = textInput.value.length;
});

// Video form submission
videoForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const text = textInput.value.trim();
    if (!text) {
        showStatus('Please enter a script.', 'error');
        return;
    }

    const voice = document.getElementById('voice').value;
    const quality = document.getElementById('quality').value;

    if (!currentUserId) {
        currentUserId = 'user-' + Math.random().toString(36).substr(2, 9);
    }

    generateBtn.disabled = true;
    showStatus('Generating your video... This may take a minute.', 'info');
    animateProgress();

    try {
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text,
                voice,
                user_id: currentUserId,
            }),
        });

        const data = await response.json();

        if (!data.success) {
            if (data.need_purchase) {
                showStatus('', 'hidden');
                showPaymentModal();
            } else {
                showStatus(data.message || 'Error generating video.', 'error');
            }
            generateBtn.disabled = false;
            return;
        }

        currentVideoFilename = data.filename;
        videoPlayer.src = data.video_url;
        videoPlayer.controls = true;
        previewContainer.innerHTML = '';
        previewContainer.appendChild(videoPlayer);

        downloadLink.href = data.video_url;
        downloadLink.download = data.filename;
        resultActions.classList.remove('hidden');

        creditsDisplay.textContent = data.remaining_credits;
        showStatus(`Video generated! You have ${data.remaining_credits} credits left.`, 'success');

        textInput.value = '';
        charCountDisplay.textContent = '0';
    } catch (error) {
        showStatus(error.message || 'Error generating video.', 'error');
    } finally {
        generateBtn.disabled = false;
    }
});

function showStatus(message, type) {
    if (type === 'hidden') {
        statusContainer.classList.add('hidden');
        return;
    }

    statusContainer.classList.remove('hidden');
    statusMessage.textContent = message;
    statusMessage.style.color = type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#cbd5e1';
}

function animateProgress() {
    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.random() * 30;
        if (progress > 90) progress = 90;
        progressFill.style.width = progress + '%';
        if (progress >= 90) clearInterval(interval);
    }, 500);
}

function showPaymentModal() {
    paymentModal.classList.remove('hidden');
}

closeModalBtn.addEventListener('click', () => {
    paymentModal.classList.add('hidden');
});

paymentModal.addEventListener('click', (e) => {
    if (e.target === paymentModal) {
        paymentModal.classList.add('hidden');
    }
});

purchaseBtn.addEventListener('click', async () => {
    purchaseBtn.disabled = true;
    purchaseBtn.textContent = 'Processing...';

    try {
        const response = await fetch('/api/purchase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: currentUserId }),
        });

        const data = await response.json();
        if (data.success) {
            creditsDisplay.textContent = data.remaining_credits;
            paymentModal.classList.add('hidden');
            showStatus('Purchase successful! You now have ' + data.remaining_credits + ' credits.', 'success');
            purchaseBtn.textContent = 'Pay with Card';
            purchaseBtn.disabled = false;
        }
    } catch (error) {
        showStatus('Payment failed. Please try again.', 'error');
        purchaseBtn.textContent = 'Pay with Card';
        purchaseBtn.disabled = false;
    }
});

shareBtn.addEventListener('click', () => {
    if (currentVideoFilename) {
        const url = window.location.href + 'video/' + currentVideoFilename;
        navigator.share ? navigator.share({ title: 'My Video', url }) : alert('Share link: ' + url);
    }
});

loginBtn.addEventListener('click', () => {
    loginModal.classList.remove('hidden');
});

closeLoginModal.addEventListener('click', () => {
    loginModal.classList.add('hidden');
});

loginModal.addEventListener('click', (e) => {
    if (e.target === loginModal) {
        loginModal.classList.add('hidden');
    }
});

loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    currentUserId = 'user-' + btoa(email).substr(0, 12);
    loginModal.classList.add('hidden');
    loginBtn.textContent = email.split('@')[0];
    showStatus('Logged in as ' + email, 'success');
    loginForm.reset();
});

// Fetch initial credits
async function fetchCredits() {
    if (!currentUserId) {
        currentUserId = 'guest-' + Math.random().toString(36).substr(2, 9);
    }
    try {
        const response = await fetch(`/api/credits/${currentUserId}`);
        const data = await response.json();
        creditsDisplay.textContent = data.remaining_credits;
    } catch (error) {
        console.error('Error fetching credits:', error);
    }
}

fetchCredits();
