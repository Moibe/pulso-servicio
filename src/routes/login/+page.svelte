<script lang="ts">
  import { untrack } from 'svelte';
  import { enhance } from '$app/forms';
  import type { ActionData } from './$types';
  let { form }: { form: ActionData } = $props();
  let showPw = $state(false);
  // Estado propio (bind:value) en vez de value={form?.username ?? ''}: un binding de
  // una sola vía se resincroniza también en renders no relacionados (p.ej. el toggle
  // del ojito), borrando lo que el usuario esté escribiendo. El effect solo restaura
  // el username tras un intento fallido de login.
  let username = $state(untrack(() => form?.username ?? ''));
  $effect(() => {
    if (form?.username != null) username = form.username;
  });
</script>

<div class="login-wrap">
  <div class="card">
    <div class="brand">
      <span class="brand-ico" aria-hidden="true"></span>
      <span class="brand-title">Pulso Servicio</span>
    </div>

    <h1>Iniciar sesión</h1>

    <form method="POST" use:enhance>
      <div class="field">
        <label for="username">Usuario</label>
        <input id="username" name="username" type="text" autocomplete="username" bind:value={username} />
      </div>
      <div class="field">
        <label for="password">Contraseña</label>
        <div class="pw-wrap">
          <input
            id="password"
            name="password"
            type={showPw ? 'text' : 'password'}
            autocomplete="current-password"
          />
          <button
            type="button"
            class="eye"
            onclick={() => (showPw = !showPw)}
            aria-label={showPw ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            aria-pressed={showPw}
          >
            {#if showPw}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                <line x1="2" x2="22" y1="2" y2="22" />
              </svg>
            {:else}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            {/if}
          </button>
        </div>
      </div>
      {#if form?.error}<span class="err" role="alert">{form.error}</span>{/if}
      <button class="btn primary" type="submit">Entrar</button>
    </form>
  </div>
</div>

<style>
  .login-wrap {
    min-height: 100vh;
    min-height: 100dvh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
    background: linear-gradient(135deg, #fffdf7 0%, #e7e0d0 100%);
  }
  .card {
    width: 100%;
    max-width: 380px;
    background: rgba(255, 255, 255, 0.6);
    backdrop-filter: blur(8px) saturate(110%);
    -webkit-backdrop-filter: blur(8px) saturate(110%);
    border: 1px solid rgba(255, 255, 255, 0.7);
    border-radius: 16px;
    padding: 2rem;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.6),
      0 12px 40px rgba(0, 0, 0, 0.12);
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    margin-bottom: 1.5rem;
  }
  .brand-ico {
    width: 24px;
    height: 24px;
    border-radius: 6px;
    background: rgba(30, 41, 59, 0.85);
    flex-shrink: 0;
  }
  .brand-title {
    font-size: 1.15rem;
    font-weight: 700;
    color: #1e293b;
  }
  h1 {
    font-size: 1.3rem;
    font-weight: 700;
    color: #1e293b;
    margin: 0 0 1.3rem;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    margin-bottom: 1rem;
  }
  label {
    font-size: 0.82rem;
    font-weight: 600;
    color: #1e293b;
  }
  input {
    font: inherit;
    font-size: 1rem;
    color: #1e293b;
    background: #ffffff;
    border: 1px solid rgba(0, 0, 0, 0.18);
    border-radius: 10px;
    padding: 0.65rem 0.8rem;
    box-sizing: border-box;
    width: 100%;
  }
  input:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
  }
  .pw-wrap {
    position: relative;
    display: flex;
    align-items: center;
  }
  .pw-wrap input {
    padding-right: 2.6rem;
  }
  .eye {
    position: absolute;
    right: 0.5rem;
    top: 50%;
    transform: translateY(-50%);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.2rem;
    height: 2.2rem;
    padding: 0;
    border: none;
    background: transparent;
    color: rgba(30, 41, 59, 0.5);
    cursor: pointer;
    border-radius: 6px;
  }
  .eye:hover {
    color: #2563eb;
  }
  .eye svg {
    width: 18px;
    height: 18px;
  }
  .err {
    display: block;
    margin: 0 0 1rem;
    font-size: 0.82rem;
    color: #dc2626;
  }
  .btn {
    width: 100%;
    font: inherit;
    font-weight: 600;
    padding: 0.65rem 1rem;
    border-radius: 10px;
    border: 1px solid transparent;
    cursor: pointer;
  }
  .btn.primary {
    background: #2563eb;
    color: #ffffff;
    box-shadow: 0 2px 8px rgba(37, 99, 235, 0.35);
  }
  .btn.primary:hover {
    background: #1d4ed8;
  }
</style>
