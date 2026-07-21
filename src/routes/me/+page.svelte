<script lang="ts">
  import { enhance } from '$app/forms';
  import Avatar from '$lib/Avatar.svelte';
  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  // Si hay error se abre para que lo corrijas; si se guardó bien, se repliega
  // solo (el mensaje de éxito queda visible fuera del form).
  let pwOpen = $state(false);
  $effect(() => {
    if (form?.pwError) pwOpen = true;
    if (form?.pwChanged) pwOpen = false;
  });

  function fmt(d: Date | string | number | null) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
  }
</script>

<section class="wrap">
  <h1>Mi usuario</h1>

  <div class="profile">
    <Avatar username={data.username} size={64} />
    <div class="ident">
      <span class="uname">{data.username}</span>
      <span class="role {data.isAdmin ? 'admin' : 'member'}">{data.isAdmin ? 'Administrador' : 'Usuario'}</span>
      <span class="since">Desde {fmt(data.creadoEn)}</span>
    </div>
  </div>

  <div class="scope">
    <h2>Negocios</h2>
    {#if data.negocioNombres.length === 0}
      <p class="muted">
        {data.isAdmin
          ? 'Todavía no hay negocios.'
          : 'Todavía no eres miembro de ningún negocio. Pide a un administrador que te agregue.'}
      </p>
    {:else}
      <p>
        {data.isAdmin ? 'Como administrador, estás en todos los negocios:' : 'Eres miembro de:'}
      </p>
      <ul class="lista">
        {#each data.negocioNombres as nombre}<li>{nombre}</li>{/each}
      </ul>
    {/if}
  </div>

  <div class="pw">
    <button type="button" class="pw-toggle" aria-expanded={pwOpen} onclick={() => (pwOpen = !pwOpen)}>
      Cambiar contraseña
      <span class="chevron" class:open={pwOpen}>▾</span>
    </button>
    {#if form?.pwChanged}<span class="ok" role="status">Contraseña actualizada.</span>{/if}
    {#if pwOpen}
      <form method="POST" action="?/changePassword" use:enhance>
        <div class="field">
          <label for="current">Contraseña actual</label>
          <input id="current" name="current" type="password" autocomplete="current-password" />
        </div>
        <div class="field">
          <label for="next">Nueva contraseña</label>
          <input id="next" name="next" type="password" autocomplete="new-password" />
        </div>
        <div class="field">
          <label for="confirm">Confirmar nueva</label>
          <input id="confirm" name="confirm" type="password" autocomplete="new-password" />
        </div>
        {#if form?.pwError}<span class="err" role="alert">{form.pwError}</span>{/if}
        <button class="btn primary" type="submit">Actualizar contraseña</button>
      </form>
    {/if}
  </div>
</section>

<style>
  .wrap {
    max-width: 520px;
    display: flex;
    flex-direction: column;
  }
  h1 {
    margin: 0.5rem 0 1.5rem;
    font-size: 1.5rem;
    color: #1e293b;
  }
  .profile {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding-bottom: 1.5rem;
    border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  }
  .ident {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  .uname {
    font-size: 1.2rem;
    font-weight: 700;
    color: #1e293b;
  }
  .role {
    align-self: flex-start;
    font-size: 0.66rem;
    font-weight: 700;
    text-transform: uppercase;
    border-radius: 999px;
    padding: 0.1rem 0.5rem;
  }
  .role.admin {
    color: #15803d;
    background: rgba(22, 163, 74, 0.12);
    border: 1px solid rgba(22, 163, 74, 0.3);
  }
  .role.member {
    color: #1d4ed8;
    background: rgba(37, 99, 235, 0.12);
    border: 1px solid rgba(37, 99, 235, 0.3);
  }
  .since {
    font-size: 0.8rem;
    color: rgba(30, 41, 59, 0.55);
  }
  h2 {
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: #15803d;
    margin: 1.6rem 0 0.6rem;
  }
  .scope p {
    margin: 0;
    color: #1e293b;
    font-size: 0.9rem;
  }
  .muted {
    color: rgba(30, 41, 59, 0.55);
  }
  .lista {
    margin: 0.5rem 0 0;
    padding-left: 1.1rem;
    color: #1e293b;
    line-height: 1.7;
    font-size: 0.9rem;
  }
  .pw-toggle {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    background: none;
    border: none;
    padding: 0;
    margin: 1.6rem 0 0;
    font: inherit;
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: #15803d;
    cursor: pointer;
  }
  .pw-toggle:hover {
    text-decoration: underline;
  }
  .chevron {
    font-size: 0.7rem;
    transition: transform 0.15s ease;
  }
  .chevron.open {
    transform: rotate(180deg);
  }
  .pw form {
    margin-top: 0.9rem;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }
  .field {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }
  label {
    font-size: 0.82rem;
    font-weight: 600;
    color: #1e293b;
    width: 130px;
    flex-shrink: 0;
  }
  input {
    font: inherit;
    font-size: 1rem;
    color: #1e293b;
    background: #ffffff;
    border: 1px solid rgba(0, 0, 0, 0.18);
    border-radius: 10px;
    padding: 0.5rem 0.7rem;
    box-sizing: border-box;
    width: 220px;
    max-width: 100%;
  }
  input:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
  }
  .err {
    display: block;
    font-size: 0.82rem;
    color: #dc2626;
  }
  .ok {
    display: block;
    margin-top: 0.6rem;
    font-size: 0.82rem;
    color: #15803d;
  }
  .btn {
    align-self: flex-start;
    font: inherit;
    font-weight: 600;
    padding: 0.55rem 1.1rem;
    border-radius: 10px;
    border: 1px solid transparent;
    cursor: pointer;
  }
  .btn.primary {
    background: #2563eb;
    color: #ffffff;
  }
  .btn.primary:hover {
    background: #1d4ed8;
  }
</style>
