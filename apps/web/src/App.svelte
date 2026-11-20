<script>
  import { onMount } from 'svelte';
  import { auth, restoreSession, isAuthenticated } from './lib/authStore.svelte.js';
  import LoginView from './lib/views/LoginView.svelte';
  import Shell from './lib/components/Shell.svelte';
  import MapView from './lib/views/MapView.svelte';
  import UsersView from './lib/views/UsersView.svelte';
  import EventsView from './lib/views/EventsView.svelte';

  let ready = $state(false);
  let route = $state('map');

  onMount(async () => {
    await restoreSession();
    ready = true;
  });
</script>

{#if !ready}
  <div class="boot">
    <p class="muted">Cargando tracking en vivo…</p>
  </div>
{:else if !isAuthenticated()}
  <LoginView />
{:else}
  <Shell bind:route user={auth.user}>
    {#if route === 'map'}
      <MapView />
    {:else if route === 'events'}
      <EventsView />
    {:else if route === 'users'}
      <UsersView />
    {/if}
  </Shell>
{/if}

<style>
  .boot {
    min-height: 100vh;
    display: grid;
    place-items: center;
  }
</style>
