<script>
  import { onMount, onDestroy } from 'svelte';
  import { api } from '../api.js';
  import { onSocketEvent } from '../socket.js';
  import { formatDate } from '../format.js';

  let events = $state([]);
  let error = $state('');
  let off;

  async function load() {
    try {
      error = '';
      const data = await api('/tracking/events?limit=100');
      events = data.events;
    } catch (err) {
      error = err.message;
    }
  }

  onMount(async () => {
    await load();
    off = onSocketEvent('geofence:enter', (event) => {
      events = [event, ...events].slice(0, 100);
    });
    const offExit = onSocketEvent('geofence:exit', (event) => {
      events = [event, ...events].slice(0, 100);
    });
    const prev = off;
    off = () => {
      prev?.();
      offExit?.();
    };
  });

  onDestroy(() => off?.());
</script>

<section class="page">
  <header class="page-header">
    <div>
      <h2>Eventos de geocerca</h2>
      <p class="muted">Quién entra y quién sale, en tiempo real</p>
    </div>
    <button class="btn ghost" onclick={load}>Actualizar</button>
  </header>

  {#if error}
    <div class="error-banner">{error}</div>
  {/if}

  <div class="panel table-wrap">
    <table class="table">
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Dispositivo</th>
          <th>Geocerca</th>
          <th>Evento</th>
          <th>Coords</th>
          <th>Origen</th>
        </tr>
      </thead>
      <tbody>
        {#each events as event}
          <tr>
            <td>{formatDate(event.createdAt)}</td>
            <td>{event.user?.name || '—'}</td>
            <td>{event.geofence?.name || '—'}</td>
            <td>
              <span class="badge" class:ok={event.type === 'enter'} class:danger={event.type === 'exit'}>
                {event.type === 'enter' ? 'Entrada' : 'Salida'}
              </span>
            </td>
            <td>{event.lat.toFixed(5)}, {event.lng.toFixed(5)}</td>
            <td>{event.source}</td>
          </tr>
        {:else}
          <tr>
            <td colspan="6" class="muted">Sin eventos todavía</td>
          </tr>
        {/each}
      </tbody>
    </table>
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

  .table-wrap {
    padding: 1.1rem;
    overflow-x: auto;
  }
</style>
