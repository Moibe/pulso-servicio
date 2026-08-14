<script lang="ts">
  import { enhance } from '$app/forms';
  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let showModal = $state(false);
  let editingId = $state<number | null>(null);
  let editValue = $state('');

  function cerrar() {
    showModal = false;
  }
  function startEdit(e: { id: number; nombre: string }) {
    editingId = e.id;
    editValue = e.nombre;
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

{#snippet pencil(e: { id: number; nombre: string })}
  <button
    type="button"
    class="icon-btn edit"
    onclick={() => startEdit(e)}
    aria-label="Editar nombre"
    title="Editar nombre"
  >
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
  </button>
{/snippet}

{#snippet trash(e: { id: number; nombre: string })}
  <form
    method="POST"
    action="?/borrar"
    use:enhance
    onsubmit={(ev) => {
      if (!confirm(`¿Borrar a "${e.nombre}"? Es permanente.`)) ev.preventDefault();
    }}
  >
    <input type="hidden" name="empleadoId" value={e.id} />
    <button type="submit" class="icon-btn delete" aria-label="Borrar" title="Borrar">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
    </button>
  </form>
{/snippet}

{#snippet fila(e: { id: number; nombre: string; farmaciaId: number | null; farmaciaNombre: string | null })}
  <li class="item">
    {#if editingId === e.id}
      <form
        method="POST"
        action="?/renombrar"
        class="edit-form"
        use:enhance={() => async ({ result, update }) => {
          await update({ reset: false });
          if (result.type === 'success') cancelEdit();
        }}
      >
        <input type="hidden" name="empleadoId" value={e.id} />
        <input
          use:autofocusEdit
          class="edit-input"
          name="nombre"
          bind:value={editValue}
          autocomplete="off"
          onkeydown={(ev) => {
            if (ev.key === 'Escape') cancelEdit();
          }}
        />
        <button type="submit" class="btn primary sm">Guardar</button>
        <button type="button" class="btn ghost sm" onclick={cancelEdit}>Cancelar</button>
      </form>
    {:else}
      <div class="info">
        <div class="nombre-row">
          <span class="nombre">{e.nombre}</span>
          {@render pencil(e)}
          {@render trash(e)}

          <!-- Mover: al cambiar el select se envía solo (sin botón extra). -->
          <form method="POST" action="?/mover" class="mover" use:enhance>
            <input type="hidden" name="empleadoId" value={e.id} />
            <label class="sr-only" for={`mover-${e.id}`}>Mover a farmacia</label>
            <select
              id={`mover-${e.id}`}
              name="farmaciaId"
              value={e.farmaciaId ?? ''}
              onchange={(ev) => ev.currentTarget.form?.requestSubmit()}
            >
              <option value="">— Sin asignar —</option>
              {#each data.farmacias as f (f.id)}
                <option value={f.id}>{f.nombre}</option>
              {/each}
            </select>
          </form>
        </div>
        <span class="sub" class:muted={!e.farmaciaNombre}>{e.farmaciaNombre ?? 'Sin asignar'}</span>
      </div>
    {/if}
  </li>
{/snippet}

<section class="wrap">
  <header class="head">
    <h1>Empleados</h1>
    <button type="button" class="btn-nuevo" onclick={() => (showModal = true)}>+ Empleado Nuevo</button>
  </header>
  <p class="hint">
    Personal de las farmacias. Cada empleado pertenece a una sola farmacia; para moverlo, cambia su
    farmacia en la lista.
  </p>

  {#if data.empleados.length === 0}
    <p class="vacio">Aún no hay empleados. Crea el primero con “Empleado Nuevo”.</p>
  {:else}
    <ul class="lista">
      {#each data.empleados as e (e.id)}{@render fila(e)}{/each}
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
      aria-label="Nuevo empleado"
      onclick={(e) => e.stopPropagation()}
    >
      <h2>Nuevo empleado</h2>
      <form
        method="POST"
        action="?/crear"
        use:enhance={() => async ({ result, update }) => {
          await update();
          if (result.type === 'success') cerrar();
        }}
      >
        <input use:autofocus type="text" name="nombre" placeholder="Nombre del empleado" autocomplete="off" />
        <label class="lbl" for="farmaciaId">Farmacia</label>
        <select id="farmaciaId" name="farmaciaId">
          <option value="">— Sin asignar —</option>
          {#each data.farmacias as f (f.id)}
            <option value={f.id}>{f.nombre}</option>
          {/each}
        </select>
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
    gap: 0.5rem;
  }
  .item {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.6rem 1rem;
    background: rgba(255, 255, 255, 0.55);
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 12px;
    flex-wrap: wrap;
  }
  .item:hover {
    background: rgba(255, 255, 255, 0.8);
  }
  .info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
  }
  .nombre-row {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    min-width: 0;
    flex-wrap: wrap;
  }
  .nombre-row .mover {
    flex-shrink: 0;
  }
  .nombre {
    flex: 1;
    min-width: 0;
    color: #1e293b;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .sub {
    font-size: 0.78rem;
    color: rgba(30, 41, 59, 0.55);
  }
  .sub.muted {
    font-style: italic;
    color: rgba(30, 41, 59, 0.4);
  }
  .mover select,
  .modal select {
    font: inherit;
    font-size: 0.9rem;
    color: #1e293b;
    background: #fff;
    border: 1px solid rgba(0, 0, 0, 0.18);
    border-radius: 8px;
    padding: 0.35rem 0.5rem;
    max-width: 12rem;
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
  .icon-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.75rem;
    height: 1.75rem;
    flex-shrink: 0;
    padding: 0;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 8px;
    color: rgba(30, 41, 59, 0.5);
    cursor: pointer;
    transition: background 0.18s ease, color 0.18s ease, border-color 0.18s ease;
  }
  .icon-btn:hover {
    background: rgba(0, 0, 0, 0.06);
  }
  /* Lápiz de editar: azul para que sea visible como acción. */
  .icon-btn.edit {
    color: #2563eb;
    border-color: rgba(37, 99, 235, 0.25);
  }
  .icon-btn.edit:hover {
    background: rgba(37, 99, 235, 0.12);
    border-color: rgba(37, 99, 235, 0.45);
  }
  .icon-btn.delete {
    color: #dc2626;
    border-color: rgba(220, 38, 38, 0.25);
  }
  .icon-btn.delete:hover {
    background: rgba(220, 38, 38, 0.1);
    border-color: rgba(220, 38, 38, 0.45);
  }
  .err {
    color: #dc2626;
    font-size: 0.85rem;
    margin: 0.4rem 0 0;
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
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
  .modal input[type='text'] {
    width: 100%;
    box-sizing: border-box;
    padding: 0.7rem 0.9rem;
    font: inherit;
    font-size: 1rem;
    border: 1px solid rgba(0, 0, 0, 0.18);
    border-radius: 10px;
    outline: none;
  }
  .modal input[type='text']:focus {
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
  }
  .lbl {
    display: block;
    margin: 0.9rem 0 0.3rem;
    font-size: 0.82rem;
    font-weight: 600;
    color: #1e293b;
  }
  .modal select {
    width: 100%;
    max-width: none;
    padding: 0.6rem 0.7rem;
    font-size: 1rem;
  }
  .acciones {
    display: flex;
    justify-content: flex-end;
    gap: 0.6rem;
    margin-top: 1.25rem;
  }
</style>
