let currentToken = localStorage.getItem('token');
let currentUserId = localStorage.getItem('user_id');
let currentEmail = localStorage.getItem('email');

const scriptInput = document.getElementById('script');
const charCount = document.getElementById('char-count');
const creditCount = document.getElementById('credit-count');
const statusBox = document.getElementById('status');
const previewBox = document.getElementById('preview-box');
const actionRow = document.getElementById('action-row');
const downloadLink = document.getElementById('download-link');
const shareBtn = document.getElementById('share-btn');
const paymentModal = document.getElementById('payment-modal');
const authModal = document.getElementById('auth-modal');
const historyList = document.getElementById('history-list');
const loginToggle = document.getElementById('login-toggle');

let authMode = 'login';
let currentVideoUrl = '';

function setStatus(message, type = 'info') {
  statusBox.classList.remove('hidden');
  statusBox.classList.remove('success', 'error', 'info');
  statusBox.classList.add(type);
  statusBox.textContent = message;
}

function hideStatus() {
  statusBox.classList.add('hidden');
}

function updateCharCount() {
  charCount.textContent = `${scriptInput.value.length} characters`;
}

function updateUI() {
  if (currentToken) {
    document.getElementById('video-form').style.display = 'block';
    loginToggle.textContent = `${currentEmail} (Logout)`;
    fetchCredits();
    fetchHistory();
  } else {
    document.getElementById('video-form').style.display = 'none';
    creditCount.textContent = '0';
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

scriptInput.addEventListener('input', updateCharCount);

async function fetchCredits() {
  if (!currentToken) return;
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
  if (!currentToken) return;
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
    authModal.classList.remove('hidden');
    setStatus('Please log in first', 'error');
    return;
  }

  const text = scriptInput.value.trim();
  if (!text) {
    setStatus('Please write some text first.', 'error');
    return;
  }

  const voice = document.getElementById('voice').value;
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
        paymentModal.classList.remove('hidden');
        setStatus(data.message, 'error');
      } else {
        setStatus(data.message || 'Error generating video.', 'error');
      }
      return;
    }

    currentVideoUrl = data.video_url;
    previewBox.innerHTML = `<video controls src="${data.video_url}"></video>`;
    downloadLink.href = data.video_url;
    actionRow.classList.remove('hidden');
    await fetchCredits();
    await fetchHistory();
    setStatus('Video generated successfully!', 'success');
    scriptInput.value = '';
    updateCharCount();
  } catch (err) {
    setStatus('Error: ' + err.message, 'error');
  }
}

async function handlePurchase() {
  if (!currentToken) {
    authModal.classList.remove('hidden');
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
      paymentModal.classList.add('hidden');
      await fetchCredits();
      setStatus('Purchase successful! You now have ' + data.remaining_credits + ' credits.', 'success');
    }
  } catch (err) {
    setStatus('Purchase failed: ' + err.message, 'error');
  }
}

async function handleAuthSubmit(event) {
  event.preventDefault();
  const email = document.getElementById('email-input').value.trim();
  const password = document.getElementById('password-input').value;

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

    authModal.classList.add('hidden');
    setStatus(authMode === 'signup' ? 'Account created!' : 'Logged in!', 'success');
    updateUI();
  } catch (err) {
    setStatus('Error: ' + err.message, 'error');
  }
}

document.getElementById('video-form').addEventListener('submit', handleGenerate);
document.getElementById('purchase-btn').addEventListener('click', handlePurchase);
document.getElementById('login-toggle').addEventListener('click', () => {
  if (currentToken) {
    logout();
  } else {
    authModal.classList.remove('hidden');
  }
});
document.getElementById('close-payment').addEventListener('click', () => paymentModal.classList.add('hidden'));
document.getElementById('close-auth').addEventListener('click', () => authModal.classList.add('hidden'));

document.getElementById('share-btn').addEventListener('click', () => {
  if (currentVideoUrl) {
    navigator.clipboard.writeText(window.location.origin + currentVideoUrl)
      .then(() => setStatus('Video link copied!', 'success'))
      .catch(() => setStatus('Unable to copy link.', 'error'));
  }
});

document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    authMode = tab.dataset.mode;
    document.querySelectorAll('.tab').forEach((el) => el.classList.toggle('active', el === tab));
  });
});

document.getElementById('auth-form').addEventListener('submit', handleAuthSubmit);

updateCharCount();
updateUI();
