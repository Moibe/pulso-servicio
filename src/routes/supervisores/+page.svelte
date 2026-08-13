<script lang="ts">
  import { enhance } from '$app/forms';
  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let showModal = $state(false);
  let editingId = $state<number | null>(null);
  let editValue = $state('');

  function abrir() {
    showModal = true;
  }
  function cerrar() {
    showModal = false;
  }
  function startEdit(s: { id: number; nombre: string }) {
    editingId = s.id;
    editValue = s.nombre;
  }
  function cancelEdit() {
    editingId = null;
    editValue = '';
  }
  function autofocus(node: HTMLInputElement) {
    node.focus();
  }
  function autofocusEdit(node: HTMLInputElement) {
    node.focus();
    node.select();
  }
</script>

<svelte:window
  onkeydown={(e) => {
    if (e.key === 'Escape' && showModal) cerrar();
  }}
/>

<section class="wrap">
  <header class="head">
    <h1>Supervisores</h1>
    <button type="button" class="btn-nuevo" onclick={abrir}>+ Supervisor Nuevo</button>
  </header>
  <p class="hint">
    Personal que supervisa farmacias. No son cuentas de acceso: para eso están los
    <a href="/users">usuarios</a>. Un supervisor puede supervisar varias farmacias.
  </p>

  {#if data.supervisores.length === 0}
    <p class="vacio">Aún no hay supervisores. Crea el primero con “Supervisor Nuevo”.</p>
  {:else}
    <ul class="lista">
      {#each data.supervisores as s (s.id)}
        <li class="item" class:editing={editingId === s.id}>
          {#if editingId === s.id}
            <form
              method="POST"
              action="?/renombrar"
              class="edit-form"
              use:enhance={() => async ({ result, update }) => {
                await update({ reset: false });
                if (result.type === 'success') cancelEdit();
              }}
            >
              <input type="hidden" name="supervisorId" value={s.id} />
              <input
                use:autofocusEdit
                class="edit-input"
                name="nombre"
                bind:value={editValue}
                autocomplete="off"
                onkeydown={(e) => {
                  if (e.key === 'Escape') cancelEdit();
                }}
              />
              <button type="submit" class="btn primary sm">Guardar</button>
              <button type="button" class="btn ghost sm" onclick={cancelEdit}>Cancelar</button>
            </form>
          {:else}
            <div class="info">
              <span class="nombre">{s.nombre}</span>
              {#if s.numFarmacias === 0}
                <span class="sub muted">Sin farmacias asignadas</span>
              {:else}
                <span class="sub">
                  {s.numFarmacias}
                  {s.numFarmacias === 1 ? 'farmacia' : 'farmacias'}: {s.farmacias.join(' · ')}
                </span>
              {/if}
            </div>
            <button type="button" class="btn ghost sm" onclick={() => startEdit(s)}>Renombrar</button>
            <form
              method="POST"
              action="?/borrar"
              use:enhance
              onsubmit={(e) => {
                const msg =
                  s.numFarmacias > 0
                    ? `¿Borrar a "${s.nombre}"? Sus ${s.numFarmacias} farmacia(s) quedarán sin supervisor (no se borran).`
                    : `¿Borrar a "${s.nombre}"?`;
                if (!confirm(msg)) e.preventDefault();
              }}
            >
              <input type="hidden" name="supervisorId" value={s.id} />
              <button type="submit" class="btn danger sm">Borrar</button>
            </form>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
  {#if form?.error}<p class="err" role="alert">{form.error}</p>{/if}
</section>

{#if showModal}
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div class="overlay" onclick={cerrar}>
    <div
      class="modal"
      role="dialog"
      tabindex="-1"
      aria-modal="true"
      aria-label="Nuevo supervisor"
      onclick={(e) => e.stopPropagation()}
    >
      <h2>Nuevo supervisor</h2>
      <form
        method="POST"
        action="?/crear"
        use:enhance={() => async ({ result, update }) => {
          await update();
          if (result.type === 'success') cerrar();
        }}
      >
        <input use:autofocus type="text" name="nombre" placeholder="Nombre del supervisor" autocomplete="off" />
        {#if form?.error}<p class="err">{form.error}</p>{/if}
        <div class="acciones">
          <button type="button" class="btn ghost" onclick={cerrar}>Cancelar</button>
          <button type="submit" class="btn primary">Ok</button>
        </div>
      </form>
    </div>
  </div>
{/if}

<style>
  .wrap {
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
  }
  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
  }
  h1 {
    margin: 0;
    font-size: 1.5rem;
    color: #1e293b;
  }
  .hint {
    color: rgba(30, 41, 59, 0.6);
    font-size: 0.85rem;
    margin: 0;
  }
  .hint a {
    color: #2563eb;
  }
  .vacio {
    color: rgba(30, 41, 59, 0.65);
    font-size: 0.95rem;
    margin: 0;
  }
  .btn-nuevo {
    background: #2563eb;
    color: #fff;
    border: none;
    border-radius: 10px;
    padding: 0.6rem 1.1rem;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(37, 99, 235, 0.35);
  }
  .btn-nuevo:hover {
    background: #1d4ed8;
  }
  .lista {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }
  .item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1.1rem;
    background: rgba(255, 255, 255, 0.55);
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 12px;
  }
  .item:hover {
    background: rgba(255, 255, 255, 0.8);
  }
  .info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }
  .nombre {
    color: #1e293b;
    font-weight: 600;
  }
  .sub {
    font-size: 0.8rem;
    color: rgba(30, 41, 59, 0.6);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .sub.muted {
    font-style: italic;
    color: rgba(30, 41, 59, 0.45);
  }
  .edit-form {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    flex: 1;
    min-width: 0;
    flex-wrap: wrap;
  }
  .edit-input {
    flex: 1;
    min-width: 0;
    padding: 0.45rem 0.65rem;
    font: inherit;
    font-size: 1rem;
    border: 1px solid rgba(37, 99, 235, 0.5);
    border-radius: 8px;
    outline: none;
  }
  .btn {
    font: inherit;
    font-weight: 600;
    padding: 0.55rem 1rem;
    border-radius: 10px;
    border: 1px solid transparent;
    cursor: pointer;
    text-decoration: none;
  }
  .btn.sm {
    padding: 0.4rem 0.8rem;
    font-size: 0.82rem;
  }
  .btn.primary {
    background: #2563eb;
    color: #fff;
  }
  .btn.primary:hover {
    background: #1d4ed8;
  }
  .btn.ghost {
    background: transparent;
    border-color: rgba(0, 0, 0, 0.15);
    color: rgba(30, 41, 59, 0.75);
  }
  .btn.ghost:hover {
    border-color: rgba(0, 0, 0, 0.3);
  }
  .btn.danger {
    background: transparent;
    border-color: rgba(220, 38, 38, 0.4);
    color: #dc2626;
  }
  .btn.danger:hover {
    background: rgba(220, 38, 38, 0.08);
    border-color: #dc2626;
  }
  .err {
    color: #dc2626;
    font-size: 0.85rem;
    margin: 0.4rem 0 0;
  }
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.45);
    backdrop-filter: blur(2px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 50;
    padding: 1rem;
  }
  .modal {
    width: 100%;
    max-width: 400px;
    background: #fff;
    border-radius: 16px;
    padding: 1.5rem;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);
  }
  .modal h2 {
    margin: 0 0 1rem;
    font-size: 1.2rem;
    color: #1e293b;
  }
  .modal input {
    width: 100%;
    box-sizing: border-box;
    padding: 0.7rem 0.9rem;
    font: inherit;
    font-size: 1rem;
    border: 1px solid rgba(0, 0, 0, 0.18);
    border-radius: 10px;
    outline: none;
  }
  .modal input:focus {
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
  }
  .acciones {
    display: flex;
    justify-content: flex-end;
    gap: 0.6rem;
    margin-top: 1.25rem;
  }
</style>
