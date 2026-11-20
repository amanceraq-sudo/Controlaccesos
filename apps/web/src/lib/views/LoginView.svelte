<script>
  import { login, auth } from '../authStore.svelte.js';

  let email = $state('admin@accesos.local');
  let password = $state('Admin123!');

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      await login(email, password);
    } catch {
      // error ya en auth.error
    }
  }
</script>

<section class="login-wrap">
  <div class="hero panel">
    <p class="eyebrow">Monorepo · Svelte + Express + MongoDB + Leaflet</p>
    <h1>AccesoVivo</h1>
    <p class="lead muted">
      Visualiza el movimiento de dispositivos móviles en tiempo real, dibuja geocercas y detecta
      entradas y salidas al instante. Flutter usará Socket.IO más adelante.
    </p>
  </div>

  <form class="panel form" onsubmit={handleSubmit}>
    <h2>Iniciar sesión</h2>
    <p class="muted">Panel web de monitoreo sobre mapa Leaflet.</p>

    {#if auth.error}
      <div class="error-banner">{auth.error}</div>
    {/if}

    <div class="field">
      <label for="email">Correo</label>
      <input id="email" type="email" bind:value={email} required />
    </div>

    <div class="field">
      <label for="password">Contraseña</label>
      <input id="password" type="password" bind:value={password} required />
    </div>

    <button class="btn" type="submit" disabled={auth.loading}>
      {auth.loading ? 'Entrando…' : 'Entrar'}
    </button>
  </form>
</section>

<style>
  .login-wrap {
    min-height: 100vh;
    display: grid;
    grid-template-columns: 1.2fr 0.8fr;
    gap: 1.5rem;
    padding: 2rem;
    align-items: center;
  }

  .hero {
    padding: 2.5rem;
    min-height: 420px;
    display: flex;
    flex-direction: column;
    justify-content: end;
    background:
      linear-gradient(160deg, rgba(61, 155, 132, 0.18), transparent 50%),
      var(--bg-elevated);
  }

  .eyebrow {
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-size: 0.75rem;
    color: var(--accent);
    font-weight: 700;
  }

  .hero h1 {
    font-size: clamp(2.8rem, 6vw, 4.5rem);
    margin: 0.4rem 0 0.8rem;
  }

  .lead {
    max-width: 34rem;
    line-height: 1.6;
    font-size: 1.05rem;
  }

  .form {
    padding: 1.75rem;
    display: grid;
    gap: 1rem;
  }

  .form h2 {
    font-size: 1.6rem;
  }

  @media (max-width: 900px) {
    .login-wrap {
      grid-template-columns: 1fr;
      padding: 1rem;
    }

    .hero {
      min-height: 240px;
    }
  }
</style>
