<script lang="ts">
  import { portal } from '$lib/portal';
  import { onMount } from 'svelte';
  import { enhance } from '$app/forms';
  import ConfirmDialog from '$lib/ConfirmDialog.svelte';
  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let showModal = $state(false);
  let nombre = $state('');

  // Borrar farmacia: un solo modal + form compartidos por todas las tarjetas
  // (nunca hay más de un borrado pendiente a la vez).
  let pendingDelete = $state<{ id: number; nombre: string } | null>(null);
  let deleteFormEl: HTMLFormElement;

  function abrir() {
    showModal = true;
  }
  function cerrar() {
    showModal = false;
    nombre = '';
  }

  // Enfoca el input en cuanto aparece el modal.
  function autofocus(node: HTMLInputElement) {
    node.focus();
  }
  function autofocusEdit(node: HTMLInputElement) {
    node.focus();
    node.select();
  }

  const fmtFecha = (d: Date | string | number) =>
    new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });

  // Edición inline del nombre de la farmacia.
  let editingId = $state<number | null>(null);
  let editValue = $state('');
  function startEdit(p: { id: number; nombre: string }) {
    editingId = p.id;
    editValue = p.nombre;
  }
  function cancelEdit() {
    editingId = null;
    editValue = '';
  }

  // Vista lista / mosaico, persistida en localStorage.
  const VIEW_STORAGE_KEY = 'pulso:farmacias-view';
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
</script>

<svelte:window
  onkeydown={(e) => {
    if (e.key === 'Escape' && showModal) cerrar();
  }}
/>

{#snippet editForm(p: { id: number })}
  <form
    method="POST"
    action="?/renombrarFarmacia"
    class="edit-form"
    use:enhance={() => {
      return async ({ result, update }) => {
        await update({ reset: false });
        if (result.type === 'success') cancelEdit();
      };
    }}
  >
    <input type="hidden" name="farmaciaId" value={p.id} />
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
    <button type="submit" class="icon-btn save" aria-label="Guardar" title="Guardar">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
    </button>
    <button type="button" class="icon-btn" onclick={cancelEdit} aria-label="Cancelar" title="Cancelar">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
    </button>
  </form>
{/snippet}

{#snippet pencil(p: { id: number; nombre: string })}
  <button
    type="button"
    class="icon-btn edit"
    onclick={() => startEdit(p)}
    aria-label="Editar nombre"
    title="Editar nombre"
  >
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
  </button>
{/snippet}

{#snippet trash(p: { id: number; nombre: string })}
  <button
    type="button"
    class="icon-btn delete"
    onclick={() => (pendingDelete = p)}
    aria-label="Borrar farmacia"
    title="Borrar farmacia"
  >
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
  </button>
{/snippet}

<section class="farmacias">
  <header class="head">
    <h1>Farmacias</h1>
    <button type="button" class="btn-nuevo" onclick={abrir}>+ Farmacia Nueva</button>
  </header>

  {#if data.farmacias.length === 0}
    <p class="vacio">Aún no tienes farmacias. Crea la primera con “Farmacia Nueva”.</p>
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
        {#each data.farmacias as p (p.id)}
          <li class="tile" class:editing={editingId === p.id}>
            {#if editingId === p.id}
              {@render editForm(p)}
            {:else}
              <a class="tile-nombre-link" href={`/farmacias/${p.id}`}>
                <span class="tile-nombre">{p.nombre}</span>
              </a>
              {#if p.creadoEn}<span class="tile-fecha">{fmtFecha(p.creadoEn)}</span>{/if}
              {#if p.canManage}
                {@render pencil(p)}
                {@render trash(p)}
              {/if}
            {/if}
          </li>
        {/each}
      </ul>
    {:else}
      <ul class="lista">
        {#each data.farmacias as p (p.id)}
          <li class="item" class:editing={editingId === p.id}>
            {#if editingId === p.id}
              {@render editForm(p)}
            {:else}
              <a class="item-link" href={`/farmacias/${p.id}`}>
                <span class="item-nombre">{p.nombre}</span>
              </a>
              {#if p.creadoEn}<span class="item-fecha">{fmtFecha(p.creadoEn)}</span>{/if}
              {#if p.canManage}
                {@render pencil(p)}
                {@render trash(p)}
              {/if}
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
  {/if}
</section>

{#if showModal}
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div use:portal class="overlay" onclick={cerrar}>
    <div class="modal" role="dialog" tabindex="-1" aria-modal="true" aria-label="Nueva farmacia" onclick={(e) => e.stopPropagation()}>
      <h2>Nueva farmacia</h2>
      <form
        method="POST"
        action="?/crear"
        use:enhance={() => {
          return async ({ result, update }) => {
            await update();
            if (result.type === 'success') cerrar();
          };
        }}
      >
        <input
          use:autofocus
          type="text"
          name="nombre"
          placeholder="Nombre de la farmacia"
          bind:value={nombre}
          autocomplete="off"
        />
        {#if form?.error}<p class="error">{form.error}</p>{/if}
        <div class="acciones">
          <button type="button" class="btn-cancelar" onclick={cerrar}>Cancelar</button>
          <button type="submit" class="btn-ok">Ok</button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- Form oculto compartido por todas las tarjetas: solo hay un borrado
     pendiente a la vez, así que no hace falta un form por tarjeta. -->
<form
  method="POST"
  action="?/borrarFarmacia"
  bind:this={deleteFormEl}
  use:enhance={() => async ({ update }) => {
    await update();
  }}
  class="hidden-form"
>
  <input type="hidden" name="farmaciaId" value={pendingDelete?.id ?? ''} />
</form>

<ConfirmDialog
  open={pendingDelete !== null}
  title="Borrar farmacia"
  message={pendingDelete
    ? `¿Borrar "${pendingDelete.nombre}"? Es permanente. Sus empleados no se borran: quedan sin asignar.`
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
  .farmacias {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
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
    transition: background 0.18s ease, transform 0.12s ease;
  }
  .btn-nuevo:hover {
    background: #1d4ed8;
  }
  .btn-nuevo:active {
    transform: translateY(1px);
  }

  .vacio {
    color: rgba(30, 41, 59, 0.65);
    font-size: 0.95rem;
    margin: 0;
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
    padding: 0.85rem 1.1rem;
    background: rgba(255, 255, 255, 0.55);
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 12px;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
    transition: background 0.18s ease, border-color 0.18s ease;
  }
  .item:hover {
    background: rgba(255, 255, 255, 0.8);
    border-color: rgba(37, 99, 235, 0.35);
  }
  .item.editing {
    border-color: rgba(37, 99, 235, 0.45);
    background: rgba(255, 255, 255, 0.85);
  }
  .item-link {
    flex: 1;
    min-width: 0;
    text-decoration: none;
  }
  .item-nombre {
    color: #1e293b;
    font-weight: 500;
  }
  .item-fecha {
    color: rgba(30, 41, 59, 0.55);
    font-size: 0.8rem;
    white-space: nowrap;
  }
  /* En móvil vertical el renglón no da para nombre + fecha + los 3 botones, y
     la fecha de creación no es dato que se ocupe aquí: se oculta solo en ese
     caso. En horizontal (y en cualquier pantalla ancha) sí cabe y se conserva. */
  @media (max-width: 768px) and (orientation: portrait) {
    .item-fecha {
      display: none;
    }
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
    justify-content: center;
    gap: 0.4rem;
    padding: 1.4rem 1rem 1.1rem;
    min-height: 7rem;
    text-align: center;
    background: rgba(255, 255, 255, 0.55);
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 12px;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
    transition: background 0.18s ease, border-color 0.18s ease, transform 0.12s ease;
  }
  .tile:hover {
    background: rgba(255, 255, 255, 0.85);
    border-color: rgba(37, 99, 235, 0.35);
    transform: translateY(-2px);
  }
  .tile.editing {
    border-color: rgba(37, 99, 235, 0.45);
    background: rgba(255, 255, 255, 0.85);
  }
  .tile-nombre-link {
    text-decoration: none;
    max-width: 100%;
  }
  .tile-nombre {
    color: #1e293b;
    font-weight: 600;
    font-size: 0.95rem;
    line-height: 1.3;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
  }
  .tile-fecha {
    color: rgba(30, 41, 59, 0.5);
    font-size: 0.75rem;
  }
  /* Orden visual (izq→der): lápiz, bote. Separados 0.6rem entre sí (el
     intervalo de 2.6rem = 2rem de ancho del icon-btn + 0.6rem de hueco; si
     igualara el ancho quedarían pegados). */
  .tile .icon-btn.edit {
    position: absolute;
    top: 0.4rem;
    right: 3rem;
  }
  .tile .icon-btn.delete {
    position: absolute;
    top: 0.4rem;
    right: 0.4rem;
  }
  .tile .edit-form {
    width: 100%;
    /* En una tile (~150px) no caben el input y los dos botones en la misma
       línea: el nombre quedaba recortado a dos o tres letras. El input se lleva
       una fila entera y los botones bajan debajo, centrados. */
    flex-wrap: wrap;
    justify-content: center;
  }
  .tile .edit-input {
    /* border-box es imprescindible: con content-box, un flex-basis del 100% le
       suma encima el padding y el borde, y el campo se sale de la tile. */
    box-sizing: border-box;
    flex: 1 1 100%;
  }

  /* Edición inline */
  .edit-form {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    flex: 1;
    min-width: 0;
  }
  .edit-input {
    flex: 1;
    min-width: 0;
    padding: 0.4rem 0.6rem;
    font-size: 1rem;
    border: 1px solid rgba(37, 99, 235, 0.5);
    border-radius: 8px;
    outline: none;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
  }
  .icon-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
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
  .icon-btn.save {
    color: #16a34a;
  }
  .icon-btn.save:hover {
    background: rgba(22, 163, 74, 0.12);
    color: #15803d;
  }

  /* Modal */
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.45);
    /* El prefijo va primero: la versión sin prefijar no existe hasta Safari 18,
       así que en iOS <= 17 el desenfoque del modal se descartaba callado. */
    -webkit-backdrop-filter: blur(2px);
    backdrop-filter: blur(2px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 50;
    padding: max(1rem, env(safe-area-inset-top, 0px)) max(1rem, env(safe-area-inset-right, 0px))
      max(1rem, env(safe-area-inset-bottom, 0px)) max(1rem, env(safe-area-inset-left, 0px));
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
    font-size: 1rem;
    border: 1px solid rgba(0, 0, 0, 0.18);
    border-radius: 10px;
    outline: none;
    transition: border-color 0.18s ease, box-shadow 0.18s ease;
  }
  .modal input:focus {
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
  }
  .error {
    color: #dc2626;
    font-size: 0.85rem;
    margin: 0.6rem 0 0;
  }
  .acciones {
    display: flex;
    justify-content: flex-end;
    gap: 0.6rem;
    margin-top: 1.25rem;
  }
  .btn-cancelar {
    background: transparent;
    color: rgba(30, 41, 59, 0.75);
    border: 1px solid rgba(0, 0, 0, 0.15);
    border-radius: 10px;
    padding: 0.55rem 1rem;
    font-size: 0.9rem;
    cursor: pointer;
    transition: background 0.18s ease;
  }
  .btn-cancelar:hover {
    background: rgba(0, 0, 0, 0.05);
  }
  .btn-ok {
    background: #16a34a;
    color: #fff;
    border: none;
    border-radius: 10px;
    padding: 0.55rem 1.4rem;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(22, 163, 74, 0.35);
    transition: background 0.18s ease, transform 0.12s ease;
  }
  .btn-ok:hover {
    background: #15803d;
  }
  .btn-ok:active {
    transform: translateY(1px);
  }
</style>
