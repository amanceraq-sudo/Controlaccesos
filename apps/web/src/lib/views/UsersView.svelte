<script>
  import { onMount } from 'svelte';
  import { api } from '../api.js';
  import { auth } from '../authStore.svelte.js';
  import { statusLabel } from '../format.js';

  let users = $state([]);
  let error = $state('');
  let form = $state({
    name: '',
    email: '',
    password: '',
    role: 'resident',
    accessCode: ''
  });

  const canCreate = $derived(auth.user.role === 'admin');

  async function load() {
    const data = await api('/users');
    users = data.users;
  }

  async function createUser(event) {
    event.preventDefault();
    try {
      error = '';
      const body = { ...form };
      if (!body.accessCode) delete body.accessCode;
      await api('/users', { method: 'POST', body });
      form = { name: '', email: '', password: '', role: 'resident', accessCode: '' };
      await load();
    } catch (err) {
      error = err.message;
    }
  }

  async function toggleActive(user) {
    try {
      await api(`/users/${user.id}`, {
        method: 'PATCH',
        body: { active: !user.active }
      });
      await load();
    } catch (err) {
      error = err.message;
    }
  }

  onMount(load);
</script>

<section class="page">
  <header>
    <h2>Dispositivos / usuarios</h2>
    <p class="muted">Admin y operadores monitorean; los roles resident representan dispositivos móviles</p>
  </header>

  {#if error}
    <div class="error-banner">{error}</div>
  {/if}

  {#if canCreate}
    <form class="panel form" onsubmit={createUser}>
      <h3>Nuevo usuario</h3>
      <div class="row">
        <div class="field">
          <label for="name">Nombre</label>
          <input id="name" bind:value={form.name} required />
        </div>
        <div class="field">
          <label for="email">Correo</label>
          <input id="email" type="email" bind:value={form.email} required />
        </div>
        <div class="field">
          <label for="password">Contraseña</label>
          <input id="password" type="password" bind:value={form.password} required minlength="6" />
        </div>
      </div>
      <div class="row">
        <div class="field">
          <label for="role">Rol</label>
          <select id="role" bind:value={form.role}>
            <option value="resident">Residente</option>
            <option value="guard">Guardia</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div class="field">
          <label for="accessCode">Código de acceso</label>
          <input id="accessCode" bind:value={form.accessCode} placeholder="Opcional" />
        </div>
      </div>
      <button class="btn" type="submit">Crear usuario</button>
    </form>
  {/if}

  <div class="panel table-wrap">
    <table class="table">
      <thead>
        <tr>
          <th>Nombre</th>
          <th>Correo</th>
          <th>Rol</th>
          <th>Código</th>
          <th>Estado</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {#each users as user}
          <tr>
            <td>{user.name}</td>
            <td>{user.email}</td>
            <td>{statusLabel(user.role)}</td>
            <td>{user.accessCode || '—'}</td>
            <td>
              <span class="badge" class:ok={user.active} class:danger={!user.active}>
                {user.active ? 'Activo' : 'Inactivo'}
              </span>
            </td>
            <td>
              {#if auth.user.role === 'admin' && user.id !== auth.user.id}
                <button class="btn ghost" onclick={() => toggleActive(user)}>
                  {user.active ? 'Desactivar' : 'Activar'}
                </button>
              {/if}
            </td>
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

  header h2 {
    font-size: 2rem;
  }

  .form,
  .table-wrap {
    padding: 1.1rem;
  }

  .form {
    display: grid;
    gap: 0.9rem;
  }

  .row {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.75rem;
  }

  @media (max-width: 900px) {
    .row {
      grid-template-columns: 1fr;
    }
  }
</style>
