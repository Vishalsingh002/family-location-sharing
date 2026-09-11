/**
 * App: Handles Profile, Photo Compression, Navbar buttons & live tracking.
 */
class App {
  constructor() {
    this.token = localStorage.getItem('token');
    this.currentUser = null;
    this.feedPollingInterval = null;
    this.mapInitialized = false;
    this.pendingAvatarBase64 = null;
  }

  async init() {
    this.applyTheme(localStorage.getItem('theme') || 'dark');

    if (this.token) {
      await this.loadCurrentUser();
    } else {
      this.showAuthScreen();
    }
  }

  showAuthScreen() {
    const authEl = document.getElementById('authScreen');
    const dashEl = document.getElementById('mainDashboard');
    if (authEl) authEl.classList.remove('d-none');
    if (dashEl) {
      dashEl.classList.add('d-none');
      dashEl.classList.remove('d-flex');
    }
  }

  async showDashboardScreen() {
    const authEl = document.getElementById('authScreen');
    const dashEl = document.getElementById('mainDashboard');
    if (authEl) authEl.classList.add('d-none');
    if (dashEl) {
      dashEl.classList.remove('d-none');
      dashEl.classList.add('d-flex');
    }

    if (!this.mapInitialized) {
      await mapManager.init();
      locationTracker.startTracking();
      this.mapInitialized = true;
    }
    setTimeout(() => {
      if (mapManager.map && mapManager.map.invalidateSize) {
        mapManager.map.invalidateSize();
      }
    }, 250);
  }

  showLoginForm() {
    document.getElementById('loginForm').classList.remove('d-none');
    document.getElementById('signupForm').classList.add('d-none');
    document.getElementById('tabLoginBtn').classList.add('active');
    document.getElementById('tabSignupBtn').classList.remove('active');
  }

  showSignupForm() {
    document.getElementById('loginForm').classList.add('d-none');
    document.getElementById('signupForm').classList.remove('d-none');
    document.getElementById('tabLoginBtn').classList.remove('active');
    document.getElementById('tabSignupBtn').classList.add('active');
  }

  authFetch(url, options = {}) {
    options.headers = options.headers || {};
    if (this.token) {
      options.headers['Authorization'] = `Bearer ${this.token}`;
    }
    return fetch(url, options);
  }

  async loadCurrentUser() {
    try {
      const res = await this.authFetch('/api/auth/me');
      if (!res.ok) {
        this.logout();
        return;
      }
      this.currentUser = await res.json();
      await this.showDashboardScreen();
      this.renderUserData();
      this.updateSosUI();
      this.startFeedPolling();
      this.loadFamilyFeed();
      this.loadGroups();
      this.loadRequests();
    } catch (e) {
      await this.showDashboardScreen();
    }
  }

  renderUserData() {
    if (!this.currentUser) return;
    const nameEl = document.getElementById('navUserName');
    if (nameEl) nameEl.innerText = this.currentUser.full_name;

    const navImg = document.getElementById('navUserAvatar');
    const navIcon = document.getElementById('navDefaultAvatarIcon');
    if (this.currentUser.avatar_url && this.currentUser.avatar_url.startsWith('data:image')) {
      if (navImg) {
        navImg.src = this.currentUser.avatar_url;
        navImg.classList.remove('d-none');
      }
      if (navIcon) navIcon.classList.add('d-none');
    } else {
      if (navImg) navImg.classList.add('d-none');
      if (navIcon) navIcon.classList.remove('d-none');
    }

    const masterSwitch = document.getElementById('masterSharingSwitch');
    if (masterSwitch) masterSwitch.checked = Boolean(this.currentUser.is_sharing);
  }

  // Toggles the glowing "I AM SAFE NOW" button in the top bar
  updateSosUI() {
    const btnContainer = document.getElementById('navSafeBtnContainer');
    if (!btnContainer) return;
    if (this.currentUser?.is_sos_active) {
      btnContainer.classList.remove('d-none');
    } else {
      btnContainer.classList.add('d-none');
    }
  }

  openProfileModal() {
    if (!this.currentUser) return;
    document.getElementById('profFullName').value = this.currentUser.full_name || '';
    document.getElementById('profPhone').value = this.currentUser.phone || '';
    document.getElementById('profBio').value = this.currentUser.profile?.bio || '';
    document.getElementById('profAddress').value = this.currentUser.profile?.home_address || '';
    document.getElementById('profBloodGroup').value = this.currentUser.profile?.blood_group || '';
    document.getElementById('profMedicalNotes').value = this.currentUser.profile?.medical_notes || '';

    const previewImg = document.getElementById('profileModalAvatarPreview');
    const placeholder = document.getElementById('profileModalAvatarPlaceholder');
    placeholder.innerText = (this.currentUser.full_name[0] || 'U').toUpperCase();

    if (this.currentUser.avatar_url && this.currentUser.avatar_url.startsWith('data:image')) {
      previewImg.src = this.currentUser.avatar_url;
      previewImg.style.display = 'inline-block';
      placeholder.style.display = 'none';
    } else {
      previewImg.style.display = 'none';
      placeholder.style.display = 'inline-flex';
    }

    this.pendingAvatarBase64 = null;
    new bootstrap.Modal(document.getElementById('profileModal')).show();
  }

  handleAvatarFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 150;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxDim) { height *= maxDim / width; width = maxDim; }
        } else {
          if (height > maxDim) { width *= maxDim / height; height = maxDim; }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85);
        this.pendingAvatarBase64 = compressedBase64;

        const previewImg = document.getElementById('profileModalAvatarPreview');
        const placeholder = document.getElementById('profileModalAvatarPlaceholder');
        previewImg.src = compressedBase64;
        previewImg.style.display = 'inline-block';
        placeholder.style.display = 'none';
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  async handleProfileUpdate(event) {
    event.preventDefault();
    const payload = {
      full_name: document.getElementById('profFullName').value.trim(),
      phone: document.getElementById('profPhone').value.trim() || null,
      bio: document.getElementById('profBio').value.trim() || null,
      home_address: document.getElementById('profAddress').value.trim() || null,
      blood_group: document.getElementById('profBloodGroup').value || null,
      medical_notes: document.getElementById('profMedicalNotes').value.trim() || null
    };

    if (this.pendingAvatarBase64) {
      payload.avatar_url = this.pendingAvatarBase64;
    }

    try {
      const res = await this.authFetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        this.currentUser = await res.json();
        this.renderUserData();
        bootstrap.Modal.getInstance(document.getElementById('profileModal')).hide();
        alert('Profile & Photo updated successfully! 🎉');
      } else {
        alert('Failed to update profile.');
      }
    } catch (e) {
      alert('Error updating profile: ' + e.message);
    }
  }

  async handleLogin(event) {
    event.preventDefault();
    const u = document.getElementById('loginUsername').value.trim();
    const p = document.getElementById('loginPassword').value;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username_or_email: u, password: p })
      });

      if (res.ok) {
        const data = await res.json();
        this.token = data.access_token;
        localStorage.setItem('token', this.token);
        await this.loadCurrentUser();
      } else {
        const err = await res.json().catch(() => ({ detail: 'Invalid credentials' }));
        alert('Login Failed: ' + (err.detail || 'Invalid username or password'));
      }
    } catch (err) {
      alert('Connection error: ' + err.message);
    }
  }

  async handleSignup(event) {
    event.preventDefault();
    const payload = {
      full_name: document.getElementById('regFullName').value.trim(),
      username: document.getElementById('regUsername').value.trim(),
      email: document.getElementById('regEmail').value.trim(),
      password: document.getElementById('regPassword').value
    };

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        this.token = data.access_token;
        localStorage.setItem('token', this.token);
        await this.loadCurrentUser();
      } else {
        const err = await res.json().catch(() => ({ detail: 'Signup failed' }));
        alert('Signup Failed: ' + (err.detail || 'Check inputs.'));
      }
    } catch (err) {
      alert('Signup connection error: ' + err.message);
    }
  }

  logout() {
    localStorage.removeItem('token');
    this.token = null;
    this.currentUser = null;
    if (this.feedPollingInterval) clearInterval(this.feedPollingInterval);
    locationTracker.stopTracking();
    this.showAuthScreen();
  }

  async handleSharingSwitch(isSharing) {
    if (!this.token) return;
    const res = await this.authFetch('/api/locations/toggle-sharing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_sharing: isSharing })
    });
    if (res.ok) {
      const data = await res.json();
      this.currentUser.is_sharing = data.is_sharing;
      this.renderUserData();
    }
  }

  async loadFamilyFeed() {
    if (!this.token) return;
    try {
      const res = await this.authFetch('/api/locations/live-feed');
      if (!res.ok) return;
      const feed = await res.json();
      mapManager.updateFamilyMarkers(feed);

      const list = document.getElementById('familyList');
      if (!list) return;
      if (feed.length === 0) {
        list.innerHTML = `<div class="text-center text-muted small py-3">No family members connected yet.</div>`;
        return;
      }

      list.innerHTML = feed.map(item => `
        <div class="member-card" onclick="mapManager.focusLocation(${item.location?.latitude || 0}, ${item.location?.longitude || 0})">
          <div class="d-flex align-items-center gap-3">
            <div class="member-avatar-box">
              ${item.full_name[0].toUpperCase()}
              ${item.location?.battery_level ? `<div class="member-battery-badge">${item.location.battery_level}%</div>` : ''}
            </div>
            <div>
              <div class="fw-bold small">${item.full_name}</div>
              <div class="text-muted" style="font-size: 11px;">
                ${item.is_sos ? '<b class="text-danger">🚨 SOS ALERT</b>' : (item.is_sharing ? '📍 Sharing Live' : 'Offline')}
                ${item.distance_km !== null ? ` • ${item.distance_km} km` : ''}
              </div>
            </div>
          </div>
          <div>${item.is_sharing ? '<i class="bi bi-broadcast text-success"></i>' : '<i class="bi bi-eye-slash text-muted"></i>'}</div>
        </div>
      `).join('');
    } catch (e) {}
  }

  async loadGroups() {
    if (!this.token) return;
    try {
      const res = await this.authFetch('/api/groups/');
      if (!res.ok) return;
      const groups = await res.json();
      const list = document.getElementById('groupsList');
      if (!list) return;
      if (groups.length === 0) {
        list.innerHTML = `<div class="text-center text-muted small py-3">No circles joined yet.</div>`;
        return;
      }
      list.innerHTML = groups.map(g => `
        <div class="member-card d-block">
          <div class="d-flex justify-content-between align-items-center mb-1">
            <b>${g.name}</b>
            <span class="badge bg-secondary">${g.member_count} members</span>
          </div>
          <div class="small text-muted">Invite Code: <code class="text-primary fw-bold">${g.invite_code}</code></div>
        </div>
      `).join('');
    } catch (e) {}
  }

  async loadRequests() {
    if (!this.token) return;
    try {
      const res = await this.authFetch('/api/friends/requests');
      if (!res.ok) return;
      const reqs = await res.json();
      const list = document.getElementById('requestsList');
      if (!list) return;
      if (reqs.length === 0) {
        list.innerHTML = `<div class="text-center text-muted small py-3">No pending requests.</div>`;
        return;
      }
      list.innerHTML = reqs.map(r => `
        <div class="member-card">
          <div>
            <b>${r.sender.full_name}</b>
            <div class="small text-muted">@${r.sender.username}</div>
          </div>
          <div class="btn-group btn-group-sm">
            <button class="btn btn-success py-0 px-2" onclick="app.respondRequest(${r.id}, 'accept')"><i class="bi bi-check-lg"></i></button>
            <button class="btn btn-danger py-0 px-2" onclick="app.respondRequest(${r.id}, 'reject')"><i class="bi bi-x-lg"></i></button>
          </div>
        </div>
      `).join('');
    } catch (e) {}
  }

  async respondRequest(reqId, action) {
    const res = await this.authFetch(`/api/friends/requests/${reqId}/respond?action=${action}`, { method: 'POST' });
    if (res.ok) {
      this.loadRequests();
      this.loadFamilyFeed();
    }
  }

  async handleSendFriendRequest(event) {
    event.preventDefault();
    const identifier = document.getElementById('targetFriendIdentifier').value;
    const res = await this.authFetch('/api/friends/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username_or_email: identifier })
    });
    if (res.ok) {
      bootstrap.Modal.getInstance(document.getElementById('addFriendModal')).hide();
      alert('Request sent successfully!');
    } else {
      const err = await res.json();
      alert('Error: ' + err.detail);
    }
  }

  async handleCreateGroup(event) {
    event.preventDefault();
    const name = document.getElementById('groupNameInput').value;
    const res = await this.authFetch('/api/groups/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    if (res.ok) {
      bootstrap.Modal.getInstance(document.getElementById('createGroupModal')).hide();
      this.loadGroups();
    }
  }

  async handleJoinGroup(event) {
    event.preventDefault();
    const code = document.getElementById('joinGroupCodeInput').value;
    const res = await this.authFetch('/api/groups/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invite_code: code })
    });
    if (res.ok) {
      bootstrap.Modal.getInstance(document.getElementById('joinGroupModal')).hide();
      this.loadGroups();
      this.loadFamilyFeed();
    } else {
      const err = await res.json();
      alert('Error: ' + err.detail);
    }
  }

  startFeedPolling() {
    if (this.feedPollingInterval) clearInterval(this.feedPollingInterval);
    this.feedPollingInterval = setInterval(() => {
      if (navigator.onLine) this.loadFamilyFeed();
    }, 7000);
  }

  toggleTheme() {
    const current = document.documentElement.getAttribute('data-bs-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    this.applyTheme(next);
  }

  applyTheme(theme) {
    document.documentElement.setAttribute('data-bs-theme', theme);
    localStorage.setItem('theme', theme);
    const btn = document.getElementById('themeToggleBtn');
    if (btn) btn.innerHTML = theme === 'dark' ? '<i class="bi bi-moon-stars"></i>' : '<i class="bi bi-sun"></i>';
  }

  openAddFriendModal() { new bootstrap.Modal(document.getElementById('addFriendModal')).show(); }
  openCreateGroupModal() { new bootstrap.Modal(document.getElementById('createGroupModal')).show(); }
  openJoinGroupModal() { new bootstrap.Modal(document.getElementById('joinGroupModal')).show(); }
}

const app = new App();
window.app = app;
window.mapManager = mapManager;
window.locationTracker = locationTracker;

window.addEventListener('DOMContentLoaded', () => app.init());