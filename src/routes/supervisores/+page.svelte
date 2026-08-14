<script lang="ts">
  import { onMount } from 'svelte';
  import { enhance } from '$app/forms';
  import ConfirmDialog from '$lib/ConfirmDialog.svelte';
  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let showModal = $state(false);
  let editingId = $state<number | null>(null);
  let editValue = $state('');

  // Modal de "asignar farmacias": qué supervisor está abierto (null = ninguno)
  // y el set de farmacias marcadas en el checklist (bind:group las mantiene).
  let showAsignarId = $state<number | null>(null);
  let selectedFarmaciaIds = $state<number[]>([]);

  // Borrar: un solo modal + form compartidos (nunca hay más de un borrado
  // pendiente a la vez).
  let pendingDelete = $state<{ id: number; nombre: string; numFarmacias: number } | null>(null);
  let deleteFormEl: HTMLFormElement;

  // Vista lista / mosaico, persistida en localStorage.
  const VIEW_STORAGE_KEY = 'pulso:supervisores-view';
  let viewMode = $state<'list' | 'mosaic'>('mosaic');
  onMount(() => {
    try {
      const v = localStorage.getItem(VIEW_STORAGE_KEY);
      if (v === 'list' || v === 'mosaic') viewMode = v;
    } catch {
      // no-op
    }
  });
  function setViewMode(mode: 'list' | 'mosaic') {
    viewMode = mode;
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, mode);
    } catch {
      // no-op
    }
  }

  function abrir() {
    showModal = true;
  }
  function cerrar() {
    showModal = false;
  }
  function abrirAsignar(s: { id: number }) {
    showAsignarId = s.id;
    selectedFarmaciaIds = data.farmacias.filter((f) => f.supervisorId === s.id).map((f) => f.id);
  }
  function cerrarAsignar() {
    showAsignarId = null;
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
    if (e.key !== 'Escape') return;
    if (showModal) cerrar();
    if (showAsignarId !== null) cerrarAsignar();
  }}
/>

{#snippet pencil(s: { id: number; nombre: string })}
  <button
    type="button"
    class="icon-btn edit"
    onclick={() => startEdit(s)}
    aria-label="Editar nombre"
    title="Editar nombre"
  >
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
  </button>
{/snippet}

{#snippet trash(s: { id: number; nombre: string; numFarmacias: number })}
  <button
    type="button"
    class="icon-btn delete"
    onclick={() => (pendingDelete = s)}
    aria-label="Borrar"
    title="Borrar"
  >
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
  </button>
{/snippet}

{#snippet editForm(s: { id: number; nombre: string })}
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
{/snippet}

{#snippet fila(s: { id: number; nombre: string; numFarmacias: number; farmacias: string[] })}
  <li class="item" class:editing={editingId === s.id}>
    {#if editingId === s.id}
      {@render editForm(s)}
    {:else}
      <div class="info">
        <div class="nombre-row">
          <span class="nombre">{s.nombre}</span>
          {@render pencil(s)}
          {@render trash(s)}
          <button type="button" class="btn ghost sm" onclick={() => abrirAsignar(s)}>Asignar Farmacias</button>
        </div>
        {#if s.numFarmacias === 0}
          <span class="sub muted">Sin farmacias asignadas</span>
        {:else}
          <span class="sub">
            {s.numFarmacias}
            {s.numFarmacias === 1 ? 'farmacia' : 'farmacias'}: {s.farmacias.join(' · ')}
          </span>
        {/if}
      </div>
    {/if}
  </li>
{/snippet}

{#snippet tile(s: { id: number; nombre: string; numFarmacias: number; farmacias: string[] })}
  <li class="tile" class:editing={editingId === s.id}>
    {#if editingId === s.id}
      {@render editForm(s)}
    {:else}
      <span class="tile-nombre">{s.nombre}</span>
      {#if s.numFarmacias === 0}
        <span class="tile-sub muted">Sin farmacias asignadas</span>
      {:else}
        <span class="tile-sub" title={s.farmacias.join(' · ')}>
          {s.numFarmacias} {s.numFarmacias === 1 ? 'farmacia' : 'farmacias'}: {s.farmacias.join(' · ')}
        </span>
      {/if}
      {@render pencil(s)}
      {@render trash(s)}
      <button type="button" class="btn ghost sm tile-asignar" onclick={() => abrirAsignar(s)}>Asignar Farmacias</button>
    {/if}
  </li>
{/snippet}

<section class="wrap">
  <header class="head">
    <h1>Supervisores</h1>
    <button type="button" class="btn-nuevo" onclick={abrir}>+ Supervisor Nuevo</button>
  </header>
  <p class="hint">
    Personal que supervisa farmacias. Un supervisor puede supervisar varias farmacias.
  </p>

  {#if data.supervisores.length === 0}
    <p class="vacio">Aún no hay supervisores. Crea el primero con “Supervisor Nuevo”.</p>
  {:else}
    <div class="toolbar">
      <div class="view-toggle" role="radiogroup" aria-label="Vista">
        <button
          type="button"
          class="view-btn"
          class:active={viewMode === 'list'}
          onclick={() => setViewMode('list')}
          aria-pressed={viewMode === 'list'}
          aria-label="Vista de lista"
          title="Vista de lista"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
        </button>
        <button
          type="button"
          class="view-btn"
          class:active={viewMode === 'mosaic'}
          onclick={() => setViewMode('mosaic')}
          aria-pressed={viewMode === 'mosaic'}
          aria-label="Vista de mosaico"
          title="Vista de mosaico"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
        </button>
      </div>
    </div>

    {#if viewMode === 'mosaic'}
      <ul class="mosaic">
        {#each data.supervisores as s (s.id)}{@render tile(s)}{/each}
      </ul>
    {:else}
      <ul class="lista">
        {#each data.supervisores as s (s.id)}{@render fila(s)}{/each}
      </ul>
    {/if}
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

{#if showAsignarId !== null}
  {@const sup = data.supervisores.find((s) => s.id === showAsignarId)}
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div class="overlay" onclick={cerrarAsignar}>
    <div
      class="modal"
      role="dialog"
      tabindex="-1"
      aria-modal="true"
      aria-label={`Farmacias de ${sup?.nombre ?? ''}`}
      onclick={(e) => e.stopPropagation()}
    >
      <h2>Farmacias de {sup?.nombre}</h2>
      {#if data.farmacias.length === 0}
        <p class="modal-nota">Todavía no hay farmacias que asignar.</p>
        <div class="acciones">
          <button type="button" class="btn ghost" onclick={cerrarAsignar}>Cerrar</button>
        </div>
      {:else}
        <p class="modal-nota">
          Marca las que supervisa (puede ser más de una). Si alguna ya tiene otro supervisor, al
          marcarla se la quitas a esa persona.
        </p>
        <form
          method="POST"
          action="?/asignarFarmacias"
          use:enhance={() => async ({ result, update }) => {
            await update();
            if (result.type === 'success') cerrarAsignar();
          }}
        >
          <input type="hidden" name="supervisorId" value={showAsignarId} />
          <ul class="checklist">
            {#each data.farmacias as f (f.id)}
              <li>
                <label class="chk">
                  <input type="checkbox" name="farmaciaId" value={f.id} bind:group={selectedFarmaciaIds} />
                  <span class="chk-nombre">{f.nombre}</span>
                  {#if f.supervisorId && f.supervisorId !== showAsignarId}
                    <span class="chk-otro">hoy: {f.supervisorNombre}</span>
                  {/if}
                </label>
              </li>
            {/each}
          </ul>
          {#if form?.error}<p class="err">{form.error}</p>{/if}
          <div class="acciones">
            <button type="button" class="btn ghost" onclick={cerrarAsignar}>Cancelar</button>
            <button type="submit" class="btn primary">Guardar</button>
          </div>
        </form>
      {/if}
    </div>
  </div>
{/if}

<!-- Form oculto compartido por todas las filas: solo hay un borrado pendiente
     a la vez, así que no hace falta un form por fila. -->
<form
  method="POST"
  action="?/borrar"
  bind:this={deleteFormEl}
  use:enhance={() => async ({ update }) => {
    await update();
  }}
  class="hidden-form"
>
  <input type="hidden" name="supervisorId" value={pendingDelete?.id ?? ''} />
</form>

<ConfirmDialog
  open={pendingDelete !== null}
  title="Borrar supervisor"
  message={pendingDelete
    ? pendingDelete.numFarmacias > 0
      ? `¿Borrar a "${pendingDelete.nombre}"? Sus ${pendingDelete.numFarmacias} farmacia(s) quedarán sin supervisor (no se borran).`
      : `¿Borrar a "${pendingDelete.nombre}"?`
    : ''}
  onConfirm={() => {
    deleteFormEl.requestSubmit();
    pendingDelete = null;
  }}
  onCancel={() => (pendingDelete = null)}
/>

<style>
  .hidden-form {
    display: none;
  }
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
  /* Toggle lista / mosaico */
  .toolbar {
    display: flex;
    justify-content: flex-end;
  }
  .view-toggle {
    display: inline-flex;
    background: rgba(255, 255, 255, 0.5);
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 8px;
    overflow: hidden;
  }
  .view-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.35rem 0.6rem;
    background: transparent;
    border: none;
    color: rgba(30, 41, 59, 0.5);
    cursor: pointer;
    transition: background 0.18s ease, color 0.18s ease;
  }
  .view-btn:hover {
    background: rgba(0, 0, 0, 0.05);
    color: rgba(30, 41, 59, 0.9);
  }
  .view-btn.active {
    color: #2563eb;
    background: rgba(37, 99, 235, 0.12);
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
  .nombre-row {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    min-width: 0;
    flex-wrap: wrap;
  }
  .nombre-row .btn {
    flex-shrink: 0;
    /* A la derecha del todo: "Asignar Farmacias" es una acción aparte, no algo
       que actúe sobre el nombre en sí como el lápiz/bote. */
    margin-left: auto;
  }
  .nombre {
    /* Sin flex-grow a propósito: si creciera, su caja llenaría el espacio libre
       y empujaría lápiz/bote lejos del texto visible. Así quedan pegados al
       nombre; solo se encoge (con ellipsis) si de verdad no cabe. */
    flex: 0 1 auto;
    min-width: 0;
    max-width: 100%;
    color: #1e293b;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
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

  /* Vista mosaico */
  .mosaic {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 150px), 1fr));
    gap: 0.85rem;
  }
  .tile {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    gap: 0.35rem;
    /* El padding de arriba deja libre la franja de los iconos absolutos
       (top 0.4rem + 1.75rem de alto = 2.15rem) para que el nombre no choque. */
    padding: 2.6rem 0.9rem 1rem;
    min-height: 8.5rem;
    text-align: center;
    background: rgba(255, 255, 255, 0.55);
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 12px;
    transition: background 0.18s ease, border-color 0.18s ease;
  }
  .tile:hover {
    background: rgba(255, 255, 255, 0.8);
  }
  .tile.editing {
    border-color: rgba(37, 99, 235, 0.45);
    background: rgba(255, 255, 255, 0.85);
  }
  .tile-nombre {
    color: #1e293b;
    font-weight: 600;
    font-size: 0.92rem;
    line-height: 1.3;
    max-width: 100%;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
  }
  .tile-sub {
    font-size: 0.76rem;
    color: rgba(30, 41, 59, 0.6);
    max-width: 100%;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
  }
  .tile-sub.muted {
    font-style: italic;
    color: rgba(30, 41, 59, 0.45);
  }
  .tile .icon-btn.edit {
    position: absolute;
    top: 0.4rem;
    right: 2.4rem;
  }
  .tile .icon-btn.delete {
    position: absolute;
    top: 0.4rem;
    right: 0.4rem;
  }
  .tile .edit-form {
    width: 100%;
    flex-wrap: wrap;
    justify-content: center;
  }
  .tile-asignar {
    width: 100%;
    margin-top: 0.1rem;
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
  .modal-nota {
    margin: 0 0 0.9rem;
    font-size: 0.85rem;
    color: rgba(30, 41, 59, 0.6);
  }
  .checklist {
    list-style: none;
    margin: 0 0 1rem;
    padding: 0;
    max-height: 280px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }
  .chk {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    padding: 0.45rem 0.5rem;
    border-radius: 8px;
    cursor: pointer;
  }
  .chk:hover {
    background: rgba(0, 0, 0, 0.04);
  }
  .chk input[type='checkbox'] {
    width: auto;
    flex-shrink: 0;
    accent-color: #2563eb;
  }
  .chk-nombre {
    flex: 1;
    min-width: 0;
    color: #1e293b;
    font-size: 0.92rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .chk-otro {
    font-size: 0.7rem;
    font-weight: 600;
    color: #b45309;
    background: rgba(245, 158, 11, 0.14);
    border: 1px solid rgba(245, 158, 11, 0.3);
    border-radius: 999px;
    padding: 0.05rem 0.5rem;
    flex-shrink: 0;
  }
  .acciones {
    display: flex;
    justify-content: flex-end;
    gap: 0.6rem;
    margin-top: 1.25rem;
  }
</style>
