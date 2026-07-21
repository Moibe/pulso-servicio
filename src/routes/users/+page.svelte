<script lang="ts">
  import { enhance } from '$app/forms';
  import Avatar from '$lib/Avatar.svelte';
  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();
  const meId = $derived(data.user?.id ?? -1);

  function fmt(d: Date | string | number) {
    return new Date(d).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function autofocusEdit(node: HTMLInputElement) {
    node.focus();
    node.select();
  }

  // Edición inline de usuario/contraseña.
  let editingId = $state<number | null>(null);
  let editUsername = $state('');
  let editPassword = $state('');
  let showEditPw = $state(false);
  function startEdit(u: { id: number; username: string }) {
    editingId = u.id;
    editUsername = u.username;
    editPassword = '';
    showEditPw = false;
  }
  function cancelEdit() {
    editingId = null;
    editUsername = '';
    editPassword = '';
    showEditPw = false;
  }
</script>

<section class="wrap">
  <h1>Usuarios</h1>
  <p class="lead">Quiénes pueden entrar al sistema. Da de alta desde aquí.</p>

  <ul class="lista">
    {#each data.users as u (u.id)}
      <li class="item" class:editing={editingId === u.id}>
        {#if editingId === u.id}
          <form
            method="POST"
            action="?/editUser"
            class="edit-form"
            use:enhance={() => {
              return async ({ result, update }) => {
                await update({ reset: false });
                if (result.type === 'success') cancelEdit();
              };
            }}
          >
            <Avatar username={editUsername || u.username} size={38} />
            <input type="hidden" name="userId" value={u.id} />
            <div class="edit-fields">
              <input
                use:autofocusEdit
                class="edit-input"
                name="username"
                bind:value={editUsername}
                placeholder="Usuario"
                autocomplete="off"
                onkeydown={(e) => {
                  if (e.key === 'Escape') cancelEdit();
                }}
              />
              <div class="pw-wrap">
                <input
                  class="edit-input"
                  name="password"
                  type={showEditPw ? 'text' : 'password'}
                  bind:value={editPassword}
                  placeholder="Nueva contraseña (opcional)"
                  autocomplete="new-password"
                  onkeydown={(e) => {
                    if (e.key === 'Escape') cancelEdit();
                  }}
                />
                <button
                  type="button"
                  class="eye"
                  onclick={() => (showEditPw = !showEditPw)}
                  aria-label={showEditPw ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  aria-pressed={showEditPw}
                >
                  {#if showEditPw}
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
            <div class="edit-actions">
              <button class="btn primary sm" type="submit">Guardar</button>
              <button class="btn ghost sm" type="button" onclick={cancelEdit}>Cancelar</button>
            </div>
            {#if form?.editError && form?.editUserId === u.id}
              <span class="err" role="alert">{form.editError}</span>
            {/if}
          </form>
        {:else}
          <div class="left">
            <Avatar username={u.username} size={38} />
            <div class="info">
              <span class="name">
                {u.username}
                {#if u.isAdmin}<span class="admin-badge">admin</span>{/if}
                {#if u.id === meId}<span class="you">tú</span>{/if}
              </span>
              <span class="meta">desde {fmt(u.creadoEn)}</span>
            </div>
          </div>
          <div class="actions">
            <button
              type="button"
              class="icon-btn edit"
              onclick={() => startEdit(u)}
              aria-label="Editar usuario"
              title="Editar usuario"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
            </button>
            {#if u.id !== meId}
              <form
                method="POST"
                action="?/delete"
                use:enhance={() => {
                  return async ({ result, update }) => {
                    await update();
                  };
                }}
              >
                <input type="hidden" name="userId" value={u.id} />
                <button
                  class="btn danger sm"
                  type="submit"
                  onclick={(e) => {
                    if (!confirm(`¿Borrar al usuario "${u.username}"? Perderá el acceso.`)) e.preventDefault();
                  }}
                >
                  Borrar
                </button>
              </form>
            {/if}
          </div>
        {/if}
      </li>
    {/each}
  </ul>
  {#if form?.deleteError}<span class="err" role="alert">{form.deleteError}</span>{/if}

  <div class="add">
    <h2>Agregar usuario</h2>
    <form method="POST" action="?/create" use:enhance>
      <div class="fields">
        <input name="username" type="text" placeholder="Usuario" value={form?.username ?? ''} autocomplete="off" />
        <input name="password" type="password" placeholder="Contraseña (mín. 4)" autocomplete="new-password" />
        <button class="btn primary" type="submit">Agregar</button>
      </div>
      <label class="chk"><input type="checkbox" name="isAdmin" /> Administrador (puede gestionar usuarios y negocios)</label>
      {#if form?.createError}<span class="err" role="alert">{form.createError}</span>{/if}
    </form>
  </div>
</section>

<style>
  .wrap {
    max-width: 640px;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }
  h1 {
    margin: 0.5rem 0 0;
    font-size: 1.5rem;
    color: #1e293b;
  }
  .lead {
    color: rgba(30, 41, 59, 0.6);
    margin: 0 0 1rem;
    font-size: 0.9rem;
  }
  .lista {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.8rem 1.1rem;
    background: rgba(255, 255, 255, 0.55);
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 12px;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
    transition: background 0.18s ease, border-color 0.18s ease;
  }
  .item.editing {
    border-color: rgba(37, 99, 235, 0.45);
    background: rgba(255, 255, 255, 0.85);
  }
  .left {
    display: flex;
    align-items: center;
    gap: 0.7rem;
  }
  .actions {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }
  .icon-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    flex-shrink: 0;
    padding: 0;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 8px;
    color: rgba(30, 41, 59, 0.5);
    cursor: pointer;
    transition: background 0.18s ease, color 0.18s ease, border-color 0.18s ease;
  }
  .icon-btn.edit {
    color: #2563eb;
    border-color: rgba(37, 99, 235, 0.25);
  }
  .icon-btn.edit:hover {
    background: rgba(37, 99, 235, 0.12);
    border-color: rgba(37, 99, 235, 0.45);
  }

  /* Edición inline (usuario + contraseña) */
  .edit-form {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    flex-wrap: wrap;
    width: 100%;
  }
  .edit-fields {
    display: flex;
    gap: 0.5rem;
    flex: 1;
    min-width: 0;
    flex-wrap: wrap;
  }
  .edit-input {
    flex: 1;
    min-width: 140px;
    padding: 0.45rem 0.7rem;
    font-size: 0.95rem;
    border: 1px solid rgba(37, 99, 235, 0.5);
    border-radius: 8px;
    outline: none;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
    box-sizing: border-box;
  }
  .pw-wrap {
    position: relative;
    display: flex;
    align-items: center;
    flex: 1;
    min-width: 140px;
  }
  .pw-wrap .edit-input {
    padding-right: 2.4rem;
  }
  .eye {
    position: absolute;
    right: 0.35rem;
    top: 50%;
    transform: translateY(-50%);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
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
    width: 16px;
    height: 16px;
  }
  .edit-actions {
    display: flex;
    gap: 0.4rem;
    flex-shrink: 0;
  }
  .btn.ghost {
    background: transparent;
    border-color: rgba(0, 0, 0, 0.15);
    color: rgba(30, 41, 59, 0.75);
  }
  .btn.ghost:hover {
    background: rgba(0, 0, 0, 0.05);
  }
  .info {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }
  .name {
    font-weight: 600;
    color: #1e293b;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .you {
    font-size: 0.66rem;
    font-weight: 700;
    text-transform: uppercase;
    color: #1d4ed8;
    background: rgba(37, 99, 235, 0.12);
    border-radius: 999px;
    padding: 0.1rem 0.45rem;
  }
  .admin-badge {
    font-size: 0.66rem;
    font-weight: 700;
    text-transform: uppercase;
    color: #15803d;
    background: rgba(22, 163, 74, 0.12);
    border: 1px solid rgba(22, 163, 74, 0.3);
    border-radius: 999px;
    padding: 0.1rem 0.45rem;
  }
  .meta {
    font-size: 0.78rem;
    color: rgba(30, 41, 59, 0.55);
  }
  .add {
    margin-top: 1.5rem;
    padding-top: 1.3rem;
    border-top: 1px solid rgba(0, 0, 0, 0.08);
  }
  .add h2 {
    font-size: 0.95rem;
    font-weight: 700;
    color: #1e293b;
    margin: 0 0 0.8rem;
  }
  .fields {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .chk {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    margin-top: 0.7rem;
    font-size: 0.85rem;
    color: rgba(30, 41, 59, 0.75);
  }
  .chk input {
    accent-color: #2563eb;
  }
  input[type='text'],
  input[type='password'] {
    font: inherit;
    font-size: 1rem;
    color: #1e293b;
    background: #ffffff;
    border: 1px solid rgba(0, 0, 0, 0.18);
    border-radius: 10px;
    padding: 0.55rem 0.75rem;
    flex: 1;
    min-width: 140px;
    box-sizing: border-box;
  }
  input:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
  }
  .btn {
    font: inherit;
    font-weight: 600;
    padding: 0.55rem 1.1rem;
    border-radius: 10px;
    border: 1px solid transparent;
    cursor: pointer;
  }
  .btn.sm {
    padding: 0.4rem 0.8rem;
    font-size: 0.82rem;
  }
  .btn.primary {
    background: #2563eb;
    color: #ffffff;
  }
  .btn.primary:hover {
    background: #1d4ed8;
  }
  .btn.danger {
    background: transparent;
    border-color: rgba(220, 38, 38, 0.4);
    color: #dc2626;
  }
  .btn.danger:hover {
    background: rgba(220, 38, 38, 0.08);
  }
  .err {
    display: block;
    margin-top: 0.5rem;
    font-size: 0.8rem;
    color: #dc2626;
  }
</style>
