<script>
  import { onMount, onDestroy } from 'svelte';
  import L from 'leaflet';
  import 'leaflet/dist/leaflet.css';
  import { api } from '../api.js';
  import { auth } from '../authStore.svelte.js';
  import { getSocket, onSocketEvent, isSocketConnected, isSocketEnabled } from '../socket.js';
  import { formatDate } from '../format.js';

  let mapEl;
  let map;
  let drawLayer;
  let myLocationMarker;
  let accuracyCircle;
  let geofenceLayers = new Map();
  let markerLayers = new Map();

  let geofences = $state([]);
  let positions = $state([]);
  let events = $state([]);
  let users = $state([]);
  let stats = $state({ liveDevices: 0, totalGeofences: 0, entersToday: 0, exitsToday: 0 });
  let error = $state('');
  let geoStatus = $state('Buscando tu ubicación…');
  let drawing = $state(false);
  let draftPoints = $state([]);
  let draftName = $state('');
  let draftColor = $state('#3d9b84');
  let simUserId = $state('');
  let myLatLng = $state(null);
  let unsubscribers = [];
  let pollTimer;

  const DEFAULT_CENTER = [19.4335, -99.1335];
  const POLL_MS = Number(import.meta.env.VITE_POLL_MS || 0);
  const canManage = $derived(['admin', 'guard'].includes(auth.user?.role));

  function showMyLocation(lat, lng, accuracy) {
    myLatLng = { lat, lng, accuracy };
    if (!map) return;

    if (myLocationMarker) {
      myLocationMarker.setLatLng([lat, lng]);
    } else {
      myLocationMarker = L.circleMarker([lat, lng], {
        radius: 10,
        color: '#ffffff',
        weight: 3,
        fillColor: '#3b82f6',
        fillOpacity: 1
      })
        .bindPopup('<strong>Tu ubicación</strong>')
        .addTo(map);
    }

    if (accuracyCircle) {
      accuracyCircle.setLatLng([lat, lng]);
      accuracyCircle.setRadius(accuracy || 40);
    } else {
      accuracyCircle = L.circle([lat, lng], {
        radius: accuracy || 40,
        color: '#3b82f6',
        weight: 1,
        fillColor: '#3b82f6',
        fillOpacity: 0.12
      }).addTo(map);
    }
  }

  function centerOnMe() {
    if (!map || !myLatLng) {
      locateBrowser({ fly: true });
      return;
    }
    map.flyTo([myLatLng.lat, myLatLng.lng], Math.max(map.getZoom(), 16), { duration: 0.8 });
  }

  function locateBrowser({ fly = true } = {}) {
    if (!navigator.geolocation) {
      geoStatus = 'Tu navegador no soporta geolocalización';
      return;
    }

    geoStatus = 'Obteniendo ubicación del navegador…';

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        showMyLocation(latitude, longitude, accuracy);
        geoStatus = `Ubicado (±${Math.round(accuracy || 0)} m)`;
        if (map && fly) {
          map.flyTo([latitude, longitude], 16, { duration: 1 });
        }
      },
      (err) => {
        const messages = {
          1: 'Permiso de ubicación denegado. Actívalo en el navegador.',
          2: 'No se pudo determinar tu posición.',
          3: 'Tiempo de espera al obtener la ubicación.'
        };
        geoStatus = messages[err.code] || 'No se pudo obtener tu ubicación';
        if (map && fly) {
          map.setView(DEFAULT_CENTER, 15);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 10000
      }
    );
  }

  function latLngsFromGeometry(geometry) {
    return (geometry?.coordinates?.[0] || []).map(([lng, lat]) => [lat, lng]);
  }

  function renderGeofences() {
    for (const [, layer] of geofenceLayers) map.removeLayer(layer);
    geofenceLayers.clear();

    for (const fence of geofences) {
      const latlngs = latLngsFromGeometry(fence.geometry);
      if (latlngs.length < 3) continue;
      const polygon = L.polygon(latlngs, {
        color: fence.color || '#3d9b84',
        weight: 2,
        fillOpacity: 0.2
      }).bindPopup(`<strong>${fence.name}</strong>`);
      polygon.addTo(map);
      geofenceLayers.set(fence.id, polygon);
    }
  }

  function renderMarkers() {
    const liveIds = new Set(positions.map((p) => (p.user?.id || p.user)?.toString()));

    for (const [id, marker] of markerLayers) {
      if (!liveIds.has(id)) {
        map.removeLayer(marker);
        markerLayers.delete(id);
      }
    }

    for (const pos of positions) {
      const userId = pos.user?.id || pos.user;
      if (!userId) continue;
      const label = pos.user?.name || 'Dispositivo';
      const zones = (pos.insideGeofences || []).map((g) => g.name || g).join(', ') || 'fuera de zonas';

      if (markerLayers.has(userId)) {
        markerLayers.get(userId).setLatLng([pos.lat, pos.lng]);
        markerLayers.get(userId).setPopupContent(`<strong>${label}</strong><br/>${zones}`);
      } else {
        const marker = L.circleMarker([pos.lat, pos.lng], {
          radius: 9,
          color: '#0f1419',
          weight: 2,
          fillColor: '#d4a017',
          fillOpacity: 0.95
        }).bindPopup(`<strong>${label}</strong><br/>${zones}`);
        marker.addTo(map);
        markerLayers.set(userId, marker);
      }
    }
  }

  function upsertPosition(pos) {
    const userId = pos.user?.id || pos.user;
    const idx = positions.findIndex((p) => (p.user?.id || p.user) === userId);
    if (idx >= 0) {
      positions = [...positions.slice(0, idx), pos, ...positions.slice(idx + 1)];
    } else {
      positions = [pos, ...positions];
    }
    stats.liveDevices = positions.length;
    renderMarkers();
  }

  function pushEvent(event) {
    events = [event, ...events].slice(0, 40);
    if (event.type === 'enter') stats.entersToday += 1;
    if (event.type === 'exit') stats.exitsToday += 1;
  }

  async function load() {
    try {
      error = '';
      const geoRes = await api('/geofences');
      geofences = geoRes.geofences;

      if (canManage) {
        const [posRes, evRes, statsRes, usersRes] = await Promise.all([
          api('/tracking/positions'),
          api('/tracking/events?limit=40'),
          api('/tracking/stats'),
          api('/users')
        ]);
        positions = posRes.positions;
        events = evRes.events;
        stats = statsRes.stats;
        users = usersRes.users.filter((u) => u.role === 'resident' && u.active);
        if (!simUserId && users[0]) simUserId = users[0].id;
      }

      renderGeofences();
      renderMarkers();
    } catch (err) {
      error = err.message;
    }
  }

  function startDrawing() {
    drawing = true;
    draftPoints = [];
    if (drawLayer) {
      map.removeLayer(drawLayer);
      drawLayer = null;
    }
  }

  function cancelDrawing() {
    drawing = false;
    draftPoints = [];
    if (drawLayer) {
      map.removeLayer(drawLayer);
      drawLayer = null;
    }
  }

  function updateDraftLayer() {
    if (drawLayer) map.removeLayer(drawLayer);
    if (draftPoints.length === 1) {
      drawLayer = L.circleMarker(draftPoints[0], { radius: 5, color: draftColor }).addTo(map);
    } else if (draftPoints.length > 1) {
      drawLayer = L.polygon(draftPoints, {
        color: draftColor,
        dashArray: '6 4',
        weight: 2,
        fillOpacity: 0.15
      }).addTo(map);
    } else {
      drawLayer = null;
    }
  }

  async function saveGeofence() {
    if (draftPoints.length < 3) {
      error = 'La geocerca necesita al menos 3 puntos';
      return;
    }
    if (!draftName.trim()) {
      error = 'Pon un nombre a la geocerca';
      return;
    }

    const ring = draftPoints.map(([lat, lng]) => [lng, lat]);
    ring.push([...ring[0]]);

    try {
      error = '';
      await api('/geofences', {
        method: 'POST',
        body: {
          name: draftName.trim(),
          color: draftColor,
          geometry: { type: 'Polygon', coordinates: [ring] }
        }
      });
      draftName = '';
      cancelDrawing();
      await load();
    } catch (err) {
      error = err.message;
    }
  }

  async function removeGeofence(id) {
    if (!confirm('¿Eliminar esta geocerca?')) return;
    try {
      await api(`/geofences/${id}`, { method: 'DELETE' });
      await load();
    } catch (err) {
      error = err.message;
    }
  }

  function simulateAt(latlng) {
    if (!canManage || !simUserId) return;
    const socket = getSocket();
    const payload = {
      userId: simUserId,
      lat: latlng.lat,
      lng: latlng.lng,
      source: 'web-sim'
    };

    if (socket?.connected) {
      socket.emit('location:update', payload);
    } else {
      api('/tracking/location', { method: 'POST', body: payload }).catch((err) => {
        error = err.message;
      });
    }
  }

  onMount(async () => {
    map = L.map(mapEl, { zoomControl: true }).setView(DEFAULT_CENTER, 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    map.on('click', (e) => {
      if (drawing) {
        draftPoints = [...draftPoints, [e.latlng.lat, e.latlng.lng]];
        updateDraftLayer();
        return;
      }
      if (canManage && simUserId) simulateAt(e.latlng);
    });

    locateBrowser({ fly: true });
    await load();

    unsubscribers = [
      onSocketEvent('location:moved', upsertPosition),
      onSocketEvent('geofence:enter', pushEvent),
      onSocketEvent('geofence:exit', pushEvent),
      onSocketEvent('geofence:updated', (fence) => {
        const idx = geofences.findIndex((g) => g.id === fence.id);
        if (idx >= 0) geofences = [...geofences.slice(0, idx), fence, ...geofences.slice(idx + 1)];
        else geofences = [...geofences, fence];
        stats.totalGeofences = geofences.filter((g) => g.active).length;
        renderGeofences();
      }),
      onSocketEvent('geofence:deleted', ({ id }) => {
        geofences = geofences.filter((g) => g.id !== id);
        stats.totalGeofences = geofences.filter((g) => g.active).length;
        renderGeofences();
      })
    ];

    // En Vercel no hay Socket.IO: polling REST para ver móviles en el mapa
    const shouldPoll = POLL_MS > 0 || !isSocketEnabled();
    if (shouldPoll && canManage) {
      const interval = POLL_MS > 0 ? POLL_MS : 3000;
      pollTimer = setInterval(() => {
        if (!isSocketConnected()) load();
      }, interval);
    }

    setTimeout(() => map.invalidateSize(), 50);
  });

  onDestroy(() => {
    if (pollTimer) clearInterval(pollTimer);
    unsubscribers.forEach((off) => off());
    map?.remove();
  });
</script>

<section class="page">
  <header class="page-header">
    <div>
      <h2>Mapa en vivo</h2>
      <p class="muted">Dispositivos móviles + geocercas Leaflet · enter/exit en tiempo real</p>
      <p class="muted geo-status">{geoStatus}</p>
    </div>
    <div class="header-actions">
      <button class="btn ghost" onclick={centerOnMe}>Mi ubicación</button>
      <button class="btn ghost" onclick={load}>Actualizar</button>
    </div>
  </header>

  {#if error}
    <div class="error-banner">{error}</div>
  {/if}

  <div class="stats">
    <article class="panel stat"><span class="muted">Dispositivos vivos</span><strong>{stats.liveDevices}</strong></article>
    <article class="panel stat"><span class="muted">Geocercas</span><strong>{stats.totalGeofences}</strong></article>
    <article class="panel stat"><span class="muted">Entradas hoy</span><strong>{stats.entersToday}</strong></article>
    <article class="panel stat"><span class="muted">Salidas hoy</span><strong>{stats.exitsToday}</strong></article>
  </div>

  <div class="workspace">
    <div class="panel map-panel">
      <div class="toolbar">
        {#if canManage}
          {#if !drawing}
            <button class="btn" onclick={startDrawing}>Dibujar geocerca</button>
          {:else}
            <input class="name-input" placeholder="Nombre de la geocerca" bind:value={draftName} />
            <input type="color" bind:value={draftColor} title="Color" />
            <button class="btn" onclick={saveGeofence} disabled={draftPoints.length < 3}>Guardar</button>
            <button class="btn ghost" onclick={cancelDrawing}>Cancelar</button>
            <span class="muted tip">Clics en el mapa = vértices ({draftPoints.length})</span>
          {/if}

          <label class="sim">
            <span class="muted">Simular dispositivo</span>
            <select bind:value={simUserId}>
              {#each users as user}
                <option value={user.id}>{user.name}</option>
              {/each}
            </select>
          </label>
          <span class="muted tip">Clic en el mapa mueve el dispositivo seleccionado</span>
        {/if}
      </div>
      <div class="map" bind:this={mapEl}></div>
    </div>

    <aside class="side">
      <div class="panel block">
        <h3>Geocercas</h3>
        <ul class="list">
          {#each geofences as fence}
            <li>
              <span class="swatch" style={`background:${fence.color}`}></span>
              <div class="grow">
                <strong>{fence.name}</strong>
                <p class="muted">{fence.description || 'Sin descripción'}</p>
              </div>
              {#if auth.user.role === 'admin'}
                <button class="btn danger" onclick={() => removeGeofence(fence.id)}>Eliminar</button>
              {/if}
            </li>
          {:else}
            <li class="muted">Dibuja tu primera geocerca en el mapa</li>
          {/each}
        </ul>
      </div>

      <div class="panel block">
        <h3>Entradas / salidas</h3>
        <ul class="list events">
          {#each events as event}
            <li>
              <span class="badge" class:ok={event.type === 'enter'} class:danger={event.type === 'exit'}>
                {event.type === 'enter' ? 'ENTRA' : 'SALE'}
              </span>
              <div class="grow">
                <strong>{event.user?.name || '—'}</strong>
                <p class="muted">
                  {event.geofence?.name || '—'} · {formatDate(event.createdAt)}
                </p>
              </div>
            </li>
          {:else}
            <li class="muted">Aún no hay eventos. Simula un movimiento sobre una geocerca.</li>
          {/each}
        </ul>
      </div>
    </aside>
  </div>
</section>

<style>
  .page {
    display: grid;
    gap: 1rem;
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: end;
    gap: 1rem;
  }

  .page-header h2 {
    font-size: 2rem;
  }

  .geo-status {
    margin-top: 0.35rem;
    font-size: 0.9rem;
  }

  .header-actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .stats {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.8rem;
  }

  .stat {
    padding: 0.9rem 1rem;
    display: grid;
    gap: 0.35rem;
  }

  .stat strong {
    font-family: var(--display);
    font-size: 1.7rem;
  }

  .workspace {
    display: grid;
    grid-template-columns: 1.5fr 0.8fr;
    gap: 1rem;
    min-height: 70vh;
  }

  .map-panel {
    display: grid;
    grid-template-rows: auto 1fr;
    overflow: hidden;
    min-height: 640px;
  }

  .toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 0.55rem;
    align-items: center;
    padding: 0.85rem 1rem;
    border-bottom: 1px solid var(--line);
  }

  .name-input {
    border: 1px solid var(--line);
    background: var(--bg-soft);
    color: var(--text);
    border-radius: 10px;
    padding: 0.55rem 0.75rem;
    min-width: 180px;
  }

  .sim {
    display: flex;
    gap: 0.45rem;
    align-items: center;
    margin-left: auto;
  }

  .sim select {
    border: 1px solid var(--line);
    background: var(--bg-soft);
    color: var(--text);
    border-radius: 10px;
    padding: 0.45rem 0.6rem;
  }

  .tip {
    font-size: 0.8rem;
  }

  .map {
    width: 100%;
    height: 100%;
    min-height: 560px;
    background: #1a222c;
  }

  .side {
    display: grid;
    gap: 1rem;
    align-content: start;
  }

  .block {
    padding: 1rem;
  }

  .block h3 {
    margin-bottom: 0.75rem;
  }

  .list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 0.65rem;
    max-height: 280px;
    overflow: auto;
  }

  .list li {
    display: flex;
    gap: 0.65rem;
    align-items: center;
  }

  .swatch {
    width: 12px;
    height: 12px;
    border-radius: 999px;
    flex: 0 0 auto;
  }

  .grow {
    flex: 1;
    min-width: 0;
  }

  .events {
    max-height: 360px;
  }

  @media (max-width: 1100px) {
    .stats,
    .workspace {
      grid-template-columns: 1fr;
    }

    .sim {
      margin-left: 0;
    }
  }
</style>
