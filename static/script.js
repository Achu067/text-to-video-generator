let currentToken = localStorage.getItem('token');
let currentUserId = localStorage.getItem('user_id');
let currentEmail = localStorage.getItem('email');

const scriptInput = document.getElementById('script') || document.getElementById('text');
const charCount = document.getElementById('char-count');
const creditCount = document.getElementById('credit-count') || document.getElementById('credits-count');
const statusBox = document.getElementById('status') || document.getElementById('status-message') || document.getElementById('status-container');
const previewBox = document.getElementById('preview-box') || document.getElementById('preview-container');
const actionRow = document.getElementById('action-row') || document.getElementById('result-actions');
const downloadLink = document.getElementById('download-link');
const shareBtn = document.getElementById('share-btn');
const paymentModal = document.getElementById('payment-modal');
const authModal = document.getElementById('auth-modal') || document.getElementById('login-modal');
const historyList = document.getElementById('history-list');
const loginToggle = document.getElementById('login-toggle') || document.getElementById('login-btn');
const authForm = document.getElementById('auth-form') || document.getElementById('login-form');
const emailInput = document.getElementById('email-input') || document.getElementById('login-email');
const passwordInput = document.getElementById('password-input') || document.getElementById('login-password');
const closePaymentBtn = document.getElementById('close-payment') || document.getElementById('close-modal');
const closeAuthBtn = document.getElementById('close-auth') || document.getElementById('close-login-modal');
const signupLink = document.getElementById('signup-link');
const purchaseBtn = document.getElementById('purchase-btn');
const videoForm = document.getElementById('video-form');

let authMode = 'login';
let currentVideoUrl = '';

function setStatus(message, type = 'info') {
  if (!statusBox) return;
  statusBox.classList.remove('hidden');
  statusBox.classList.remove('success', 'error', 'info');
  statusBox.classList.add(type);
  statusBox.textContent = message;
}

function hideStatus() {
  if (!statusBox) return;
  statusBox.classList.add('hidden');
}

function updateCharCount() {
  if (!scriptInput) return;
  charCount.textContent = `${scriptInput.value.length} characters`;
}

function updateUI() {
  if (!videoForm || !loginToggle) return;

  if (currentToken) {
    videoForm.style.display = 'block';
    loginToggle.textContent = `${currentEmail} (Logout)`;
    fetchCredits();
    fetchHistory();
  } else {
    videoForm.style.display = 'none';
    if (creditCount) creditCount.textContent = '0';
    loginToggle.textContent = 'Login';
  }
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user_id');
  localStorage.removeItem('email');
  currentToken = null;
  currentUserId = null;
  currentEmail = null;
  updateUI();
  setStatus('Logged out', 'info');
}

if (scriptInput) scriptInput.addEventListener('input', updateCharCount);

async function fetchCredits() {
  if (!currentToken || !creditCount) return;
  try {
    const res = await fetch('/api/me', {
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    if (res.status === 401) {
      logout();
      return;
    }
    const data = await res.json();
    creditCount.textContent = data.credits;
  } catch (err) {
    console.error(err);
  }
}

async function fetchHistory() {
  if (!currentToken || !historyList) return;
  try {
    const res = await fetch('/api/history', {
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    const data = await res.json();
    historyList.innerHTML = '';

    if (!data.videos || data.videos.length === 0) {
      historyList.innerHTML = '<li>No videos yet.</li>';
      return;
    }

    data.videos.forEach((video) => {
      const li = document.createElement('li');
      const link = document.createElement('a');
      link.href = `/video/${video.filename}`;
      link.textContent = video.title || video.filename;
      li.appendChild(link);
      historyList.appendChild(li);
    });
  } catch (err) {
    console.error(err);
  }
}

async function handleGenerate(event) {
  event.preventDefault();
  if (!currentToken) {
    if (authModal) authModal.classList.remove('hidden');
    setStatus('Please log in first', 'error');
    return;
  }

  const text = scriptInput ? scriptInput.value.trim() : '';
  if (!text) {
    setStatus('Please write some text first.', 'error');
    return;
  }

  const voice = document.getElementById('voice')?.value || 'en';
  setStatus('Generating video... this may take a few minutes.', 'info');

  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`
      },
      body: JSON.stringify({ text, voice })
    });

    const data = await response.json();

    if (!data.success) {
      if (data.need_purchase) {
        if (paymentModal) paymentModal.classList.remove('hidden');
        setStatus(data.message, 'error');
      } else {
        setStatus(data.message || 'Error generating video.', 'error');
      }
      return;
    }

    currentVideoUrl = data.video_url;
    if (previewBox) {
      previewBox.innerHTML = `<video controls src="${data.video_url}"></video>`;
    }
    if (downloadLink) downloadLink.href = data.video_url;
    if (actionRow) actionRow.classList.remove('hidden');
    await fetchCredits();
    await fetchHistory();
    setStatus('Video generated successfully!', 'success');
    if (scriptInput) scriptInput.value = '';
    updateCharCount();
  } catch (err) {
    setStatus('Error: ' + err.message, 'error');
  }
}

async function handlePurchase() {
  if (!currentToken) {
    if (authModal) authModal.classList.remove('hidden');
    return;
  }
  try {
    const res = await fetch('/api/purchase', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`
      },
      body: JSON.stringify({})
    });

    const data = await res.json();
    if (data.success) {
      if (paymentModal) paymentModal.classList.add('hidden');
      await fetchCredits();
      setStatus('Purchase successful! You now have ' + data.remaining_credits + ' credits.', 'success');
    }
  } catch (err) {
    setStatus('Purchase failed: ' + err.message, 'error');
  }
}

async function handleAuthSubmit(event) {
  event.preventDefault();

  const email = (emailInput ? emailInput.value : document.getElementById('login-email')?.value || '').trim();
  const password = passwordInput ? passwordInput.value : document.getElementById('login-password')?.value || '';

  if (!email || !password) {
    setStatus('Email and password are required.', 'error');
    return;
  }

  const endpoint = authMode === 'signup' ? '/api/signup' : '/api/login';
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (!data.success) {
      setStatus(data.detail || 'Authentication failed.', 'error');
      return;
    }

    currentToken = data.token;
    currentUserId = data.user_id;
    currentEmail = data.email;
    localStorage.setItem('token', currentToken);
    localStorage.setItem('user_id', currentUserId);
    localStorage.setItem('email', currentEmail);

    if (authModal) authModal.classList.add('hidden');
    setStatus(authMode === 'signup' ? 'Account created!' : 'Logged in!', 'success');
    updateUI();
  } catch (err) {
    setStatus('Error: ' + err.message, 'error');
  }
}

if (videoForm) videoForm.addEventListener('submit', handleGenerate);
if (purchaseBtn) purchaseBtn.addEventListener('click', handlePurchase);
if (loginToggle) {
  loginToggle.addEventListener('click', () => {
    if (currentToken) {
      logout();
    } else if (authModal) {
      authModal.classList.remove('hidden');
    }
  });
}
if (closePaymentBtn) closePaymentBtn.addEventListener('click', () => paymentModal && paymentModal.classList.add('hidden'));
if (closeAuthBtn) closeAuthBtn.addEventListener('click', () => authModal && authModal.classList.add('hidden'));

if (shareBtn) {
  shareBtn.addEventListener('click', () => {
    if (currentVideoUrl) {
      navigator.clipboard.writeText(window.location.origin + currentVideoUrl)
        .then(() => setStatus('Video link copied!', 'success'))
        .catch(() => setStatus('Unable to copy link.', 'error'));
    }
  });
}

if (signupLink) {
  signupLink.addEventListener('click', (event) => {
    event.preventDefault();
    authMode = 'signup';
    if (authModal) authModal.classList.remove('hidden');
  });
}

if (authForm) authForm.addEventListener('submit', handleAuthSubmit);

if (charCount && scriptInput) updateCharCount();
updateUI();
