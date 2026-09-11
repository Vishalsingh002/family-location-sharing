/**
 * MapManager: Official Google Maps HD Tiles with Zoom Controls & Avatar Photos.
 */
class MapManager {
  constructor() {
    this.map = null;
    this.markers = {};
    this.myMarker = null;
    this.myCircle = null;
  }

  async init() {
    const container = document.getElementById('mapCanvas');
    if (!container) return;

    if (this.map) {
      this.map.remove();
      this.map = null;
      this.markers = {};
      this.myMarker = null;
    }

    this.map = L.map('mapCanvas', {
      zoomControl: false,
      attributionControl: false
    }).setView([28.6139, 77.2090], 15);

    // Google Maps Clean HD Road Layer
    L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      maxZoom: 21,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
    }).addTo(this.map);

    this.map.invalidateSize();
    setTimeout(() => {
      if (this.map) this.map.invalidateSize();
    }, 250);
  }

  // ZOOM IN & ZOOM OUT FUNCTIONS
  zoomIn() {
    if (this.map) this.map.zoomIn();
  }

  zoomOut() {
    if (this.map) this.map.zoomOut();
  }

  createAvatarIcon(name, avatarUrl = null, isMe = false, isSos = false, battery = null) {
    const initial = (name ? name[0] : 'U').toUpperCase();
    const batteryBadge = battery ? `<div class="member-battery-badge">${battery}%</div>` : '';
    const pinClass = isSos ? 'pin-avatar-bubble sos' : (isMe ? 'pin-avatar-bubble me' : 'pin-avatar-bubble');

    const innerContent = (avatarUrl && avatarUrl.startsWith('data:image'))
      ? `<img src="${avatarUrl}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`
      : initial;

    return L.divIcon({
      className: 'custom-map-icon',
      html: `
        <div class="custom-map-pin">
          <div class="${pinClass}">
            ${innerContent}
            ${batteryBadge}
          </div>
          <div class="pin-point"></div>
        </div>
      `,
      iconSize: [44, 54],
      iconAnchor: [22, 54],
      popupAnchor: [0, -50]
    });
  }

  updateMyPosition(lat, lng, accuracy = 20) {
    if (!this.map) return;
    const latlng = [lat, lng];
    const name = app.currentUser?.full_name || 'You';
    const avatar = app.currentUser?.avatar_url;
    const isSos = Boolean(app.currentUser?.is_sos_active);
    const battery = locationTracker.batteryLevel;

    if (!this.myMarker) {
      this.myMarker = L.marker(latlng, {
        icon: this.createAvatarIcon(name, avatar, true, isSos, battery),
        zIndexOffset: 1000
      }).addTo(this.map).bindPopup('<b>You are here (Live)</b>');

      this.myCircle = L.circle(latlng, {
        radius: accuracy,
        color: isSos ? '#f43f5e' : '#10b981',
        weight: 1.5,
        fillColor: isSos ? '#f43f5e' : '#10b981',
        fillOpacity: 0.15
      }).addTo(this.map);

      this.map.setView(latlng, 16);
    } else {
      this.myMarker.setLatLng(latlng);
      this.myMarker.setIcon(this.createAvatarIcon(name, avatar, true, isSos, battery));
      this.myCircle.setLatLng(latlng);
      this.myCircle.setStyle({ color: isSos ? '#f43f5e' : '#10b981', fillColor: isSos ? '#f43f5e' : '#10b981' });
      this.myCircle.setRadius(accuracy);
    }
  }

  updateFamilyMarkers(familyFeed) {
    if (!this.map) return;
    familyFeed.forEach(item => {
      if (!item.location) return;
      const uid = item.user_id;
      const lat = item.location.latitude;
      const lng = item.location.longitude;
      const name = item.full_name;
      const isSos = item.is_sos;
      const battery = item.location.battery_level;

      const latlng = [lat, lng];
      const popupHtml = `
        <div style="font-family: 'Plus Jakarta Sans', sans-serif; padding: 4px;">
          <h6 style="margin: 0; font-weight: 700;">${item.full_name}</h6>
          <div style="font-size: 11px; color: #64748b;">@${item.username}</div>
          ${isSos ? '<div style="color: #ef4444; font-weight: 800; font-size: 12px; margin-top: 4px;">🚨 SOS EMERGENCY!</div>' : ''}
          <div style="font-size: 12px; margin-top: 4px;"><b>Battery:</b> ${battery ? battery + '%' : 'N/A'}</div>
          ${item.distance_km !== null ? `<div style="font-size: 12px;"><b>Distance:</b> ${item.distance_km} km away</div>` : ''}
        </div>
      `;

      if (!this.markers[uid]) {
        const marker = L.marker(latlng, {
          icon: this.createAvatarIcon(name, null, false, isSos, battery)
        }).addTo(this.map).bindPopup(popupHtml);
        this.markers[uid] = marker;
      } else {
        this.markers[uid].setLatLng(latlng);
        this.markers[uid].setIcon(this.createAvatarIcon(name, null, false, isSos, battery));
        this.markers[uid].setPopupContent(popupHtml);
      }
    });
  }

  focusLocation(lat, lng) {
    if (this.map && lat && lng) {
      this.map.setView([lat, lng], 16, { animate: true });
    }
  }

  recenterOnMe() {
    if (locationTracker.currentPosition) {
      this.focusLocation(locationTracker.currentPosition.latitude, locationTracker.currentPosition.longitude);
    }
  }
}

const mapManager = new MapManager();