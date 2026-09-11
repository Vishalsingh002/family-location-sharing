/**
 * LocationTracker: Instant 1-Click SOS Trigger & Resolve (Zero Popups, Zero Alerts).
 */
class LocationTracker {
  constructor() {
    this.watchId = null;
    this.currentPosition = null;
    this.batteryLevel = null;
    this.lastSentAt = 0;
    this.offlineQueue = JSON.parse(localStorage.getItem('offline_gps_queue') || '[]');
    this.initBattery();
    this.initNetworkListeners();
  }

  async initBattery() {
    if ('getBattery' in navigator) {
      try {
        const battery = await navigator.getBattery();
        this.batteryLevel = Math.round(battery.level * 100);
        battery.addEventListener('levelchange', () => {
          this.batteryLevel = Math.round(battery.level * 100);
        });
      } catch (e) {}
    }
  }

  initNetworkListeners() {
    window.addEventListener('online', () => {
      const banner = document.getElementById('offlineBanner');
      if (banner) banner.style.display = 'none';
      this.flushOfflineQueue();
    });

    window.addEventListener('offline', () => {
      const banner = document.getElementById('offlineBanner');
      if (banner) banner.style.display = 'block';
    });
  }

  startTracking() {
    if (!navigator.geolocation) return;

    this.watchId = navigator.geolocation.watchPosition(
      pos => this.handleSuccess(pos),
      err => console.warn('GPS:', err.message),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
  }

  stopTracking() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  handleSuccess(position) {
    const { latitude, longitude, accuracy, speed, heading } = position.coords;
    this.currentPosition = { latitude, longitude, accuracy, speed, heading };

    mapManager.updateMyPosition(latitude, longitude, accuracy);
    const accEl = document.getElementById('gpsAccuracyLabel');
    if (accEl) accEl.innerHTML = `<i class="bi bi-broadcast text-success me-1"></i> GPS: ±${Math.round(accuracy)}m`;

    const now = Date.now();
    if (app.token && (now - this.lastSentAt > 8000)) {
      this.lastSentAt = now;
      const payload = {
        latitude,
        longitude,
        accuracy,
        speed,
        heading,
        battery_level: this.batteryLevel
      };

      if (!navigator.onLine) {
        this.offlineQueue.push(payload);
        if (this.offlineQueue.length > 50) this.offlineQueue.shift();
        localStorage.setItem('offline_gps_queue', JSON.stringify(this.offlineQueue));
      } else {
        this.sendLocation(payload);
      }
    }
  }

  async sendLocation(payload) {
    try {
      await app.authFetch('/api/locations/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (e) {}
  }

  async flushOfflineQueue() {
    if (this.offlineQueue.length === 0 || !app.token) return;
    try {
      const res = await app.authFetch('/api/locations/batch-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locations: this.offlineQueue })
      });
      if (res.ok) {
        this.offlineQueue = [];
        localStorage.removeItem('offline_gps_queue');
      }
    } catch (e) {}
  }

  // 1-CLICK INSTANT SOS (No Popup, No Alert)
  async triggerSOSNow() {
    if (!this.currentPosition) return;

    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);

    // Update UI instantly
    app.currentUser.is_sos_active = true;
    app.updateSosUI();
    mapManager.updateMyPosition(this.currentPosition.latitude, this.currentPosition.longitude);

    try {
      await app.authFetch('/api/emergency/sos/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: this.currentPosition.latitude,
          longitude: this.currentPosition.longitude,
          message: 'Distress alert!'
        })
      });
    } catch (e) {
      console.error('SOS trigger err:', e);
    }
  }

  // 1-CLICK INSTANT RESOLVE (No Popup, No Alert)
  async resolveSOS() {
    // Return to normal instantly
    app.currentUser.is_sos_active = false;
    app.updateSosUI();
    if (this.currentPosition) {
      mapManager.updateMyPosition(this.currentPosition.latitude, this.currentPosition.longitude);
    }

    try {
      await app.authFetch('/api/emergency/sos/resolve', { method: 'POST' });
    } catch (e) {
      console.error('SOS resolve err:', e);
    }
  }
}

const locationTracker = new LocationTracker();