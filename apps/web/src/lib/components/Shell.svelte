<script>
  import { logout } from '../authStore.svelte.js';

  let { route = $bindable('map'), user, children } = $props();

  const links = [
    { id: 'map', label: 'Mapa en vivo' },
    { id: 'events', label: 'Eventos', roles: ['admin', 'guard'] },
    { id: 'users', label: 'Dispositivos', roles: ['admin', 'guard'] }
  ];

  const visibleLinks = $derived(
    links.filter((link) => !link.roles || link.roles.includes(user.role))
  );
</script>

<div class="shell">
  <aside class="sidebar panel">
    <div class="brand">
      <p class="eyebrow">Tracking + Geocercas</p>
      <h1>AccesoVivo</h1>
      <p class="muted small">Leaflet · Socket.IO · Express</p>
    </div>

    <nav>
      {#each visibleLinks as link}
        <button
          class="nav-link"
          class:active={route === link.id}
          onclick={() => (route = link.id)}
        >
          {link.label}
        </button>
      {/each}
    </nav>

    <div class="user-box">
      <strong>{user.name}</strong>
      <span class="muted small">{user.email}</span>
      <span class="badge">{user.role}</span>
      <button class="btn ghost" onclick={logout}>Cerrar sesión</button>
    </div>
  </aside>

  <main class="content">
    {@render children()}
  </main>
</div>

<style>
  .shell {
    min-height: 100vh;
    display: grid;
    grid-template-columns: 280px 1fr;
    gap: 1.25rem;
    padding: 1.25rem;
  }

  .sidebar {
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    position: sticky;
    top: 1.25rem;
    height: calc(100vh - 2.5rem);
  }

  .brand h1 {
    font-size: 1.8rem;
    margin-top: 0.2rem;
  }

  .eyebrow {
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-size: 0.72rem;
    color: var(--accent);
    font-weight: 700;
  }

  .small {
    font-size: 0.85rem;
  }

  nav {
    display: grid;
    gap: 0.4rem;
  }

  .nav-link {
    text-align: left;
    border: 1px solid transparent;
    background: transparent;
    color: var(--muted);
    border-radius: 12px;
    padding: 0.7rem 0.85rem;
  }

  .nav-link:hover,
  .nav-link.active {
    color: var(--text);
    background: var(--bg-soft);
    border-color: var(--line);
  }

  .user-box {
    margin-top: auto;
    display: grid;
    gap: 0.35rem;
  }

  .content {
    min-width: 0;
  }

  @media (max-width: 900px) {
    .shell {
      grid-template-columns: 1fr;
    }

    .sidebar {
      position: static;
      height: auto;
    }
  }
</style>
