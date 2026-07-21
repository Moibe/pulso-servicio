<script lang="ts">
  import { onMount } from 'svelte';
  import { enhance } from '$app/forms';
  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let showModal = $state(false);

  function abrir() {
    showModal = true;
  }
  function cerrar() {
    showModal = false;
  }

  function autofocus(node: HTMLInputElement) {
    node.focus();
  }
  function autofocusEdit(node: HTMLInputElement) {
    node.focus();
    node.select();
  }

  const fmtPrecio = (n: number | null) =>
    n == null ? '' : n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

  // Edición inline del nombre del producto.
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

  // Vista lista / mosaico, persistida en localStorage (mismo patrón que estudio-cine).
  const VIEW_STORAGE_KEY = 'menu:menu-productos-view';
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
    action="?/renombrarProducto"
    class="edit-form"
    use:enhance={() => {
      return async ({ result, update }) => {
        await update({ reset: false });
        if (result.type === 'success') cancelEdit();
      };
    }}
  >
    <input type="hidden" name="productoId" value={p.id} />
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

<section class="productos">
  <header class="head">
    <div class="titulos">
      {#if data.negocio}
        <a class="volver" href={`/negocios/${data.negocio.id}`}>← {data.negocio.nombre}</a>
      {/if}
      <h1>{data.menu.nombre}</h1>
    </div>
    {#if data.canManage}
      <button type="button" class="btn-nuevo" onclick={abrir}>+ Agregar Producto</button>
    {/if}
  </header>

  {#if data.productos.length === 0}
    <p class="vacio">
      {data.canManage
        ? 'Aún no hay productos en este menú. Agrega el primero con “Agregar Producto”.'
        : 'Este menú todavía no tiene productos.'}
    </p>
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
        {#each data.productos as p (p.id)}
          <li class="tile" class:editing={editingId === p.id}>
            <div class="tile-foto">
              {#if p.fotoPrincipal}
                <img src={p.fotoPrincipal} alt={p.nombre} />
              {:else}
                <span class="sin-foto" aria-hidden="true"></span>
              {/if}
            </div>
            <div class="tile-info">
              {#if editingId === p.id}
                {@render editForm(p)}
              {:else}
                <span class="tile-nombre">{p.nombre}</span>
                <div class="tile-meta">
                  {#if p.fotos.length}
                    <span class="tile-extra">+{p.fotos.length} foto{p.fotos.length > 1 ? 's' : ''}</span>
                  {/if}
                  {#if p.precio != null}<span class="tile-precio">{fmtPrecio(p.precio)}</span>{/if}
                  {#if data.canManage}{@render pencil(p)}{/if}
                </div>
              {/if}
            </div>
          </li>
        {/each}
      </ul>
    {:else}
      <ul class="lista">
        {#each data.productos as p (p.id)}
          <li class="item" class:editing={editingId === p.id}>
            <div class="miniatura">
              {#if p.fotoPrincipal}
                <img src={p.fotoPrincipal} alt={p.nombre} />
              {:else}
                <span class="sin-foto" aria-hidden="true"></span>
              {/if}
            </div>
            {#if editingId === p.id}
              {@render editForm(p)}
            {:else}
              <div class="info">
                <span class="item-nombre">{p.nombre}</span>
                {#if p.fotos.length}
                  <span class="item-extra">+{p.fotos.length} foto{p.fotos.length > 1 ? 's' : ''}</span>
                {/if}
              </div>
              {#if p.precio != null}<span class="item-precio">{fmtPrecio(p.precio)}</span>{/if}
              {#if data.canManage}{@render pencil(p)}{/if}
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
  {/if}
</section>

{#if showModal}
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div class="overlay" onclick={cerrar}>
    <div
      class="modal"
      role="dialog"
      tabindex="-1"
      aria-modal="true"
      aria-label="Agregar producto"
      onclick={(e) => e.stopPropagation()}
    >
      <h2>Agregar producto</h2>
      <form
        method="POST"
        action="?/agregarProducto"
        enctype="multipart/form-data"
        use:enhance={() => {
          return async ({ result, update }) => {
            await update();
            if (result.type === 'success') cerrar();
          };
        }}
      >
        <label>
          <span>Nombre</span>
          <input use:autofocus type="text" name="nombre" placeholder="Nombre del producto" autocomplete="off" />
        </label>

        <label>
          <span>Foto principal</span>
          <input type="file" name="fotoPrincipal" accept="image/*" />
        </label>

        <label>
          <span>Fotos adicionales <em>(opcional)</em></span>
          <input type="file" name="fotosAdicionales" accept="image/*" multiple />
        </label>

        <label>
          <span>Precio</span>
          <input type="number" name="precio" placeholder="0.00" step="0.01" min="0" inputmode="decimal" />
        </label>

        {#if form?.error}<p class="error">{form.error}</p>{/if}

        <div class="acciones">
          <button type="button" class="btn-cancelar" onclick={cerrar}>Cancelar</button>
          <button type="submit" class="btn-ok">Ok</button>
        </div>
      </form>
    </div>
  </div>
{/if}

<style>
  .productos {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }
  .head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
  }
  .titulos {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }
  .volver {
    font-size: 0.85rem;
    color: rgba(30, 41, 59, 0.6);
    text-decoration: none;
  }
  .volver:hover {
    color: #2563eb;
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

  /* Edición inline */
  .item.editing,
  .tile.editing {
    border-color: rgba(37, 99, 235, 0.45);
    background: rgba(255, 255, 255, 0.85);
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
    color: #1e293b;
  }
  /* Lápiz de editar: azul para que sea visible como acción. */
  .icon-btn.edit {
    color: #2563eb;
    border-color: rgba(37, 99, 235, 0.25);
  }
  .icon-btn.edit:hover {
    background: rgba(37, 99, 235, 0.12);
    border-color: rgba(37, 99, 235, 0.45);
    color: #2563eb;
  }
  .icon-btn.save {
    color: #16a34a;
  }
  .icon-btn.save:hover {
    background: rgba(22, 163, 74, 0.12);
    color: #15803d;
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
    gap: 1rem;
    padding: 0.75rem 1rem;
    background: rgba(255, 255, 255, 0.55);
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 12px;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  }
  .miniatura {
    width: 52px;
    height: 52px;
    flex-shrink: 0;
    border-radius: 10px;
    overflow: hidden;
    background: rgba(30, 41, 59, 0.06);
    border: 1px solid rgba(0, 0, 0, 0.06);
  }
  .miniatura img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .sin-foto {
    display: block;
    width: 100%;
    height: 100%;
    background: repeating-linear-gradient(
      45deg,
      rgba(30, 41, 59, 0.05),
      rgba(30, 41, 59, 0.05) 6px,
      rgba(30, 41, 59, 0.1) 6px,
      rgba(30, 41, 59, 0.1) 12px
    );
  }
  .info {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    flex: 1;
    min-width: 0;
  }
  .item-nombre {
    color: #1e293b;
    font-weight: 500;
  }
  .item-extra {
    color: rgba(30, 41, 59, 0.55);
    font-size: 0.78rem;
  }
  .item-precio {
    color: #15803d;
    font-weight: 600;
    white-space: nowrap;
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
    display: flex;
    flex-direction: column;
    background: rgba(255, 255, 255, 0.55);
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
    transition: background 0.18s ease, border-color 0.18s ease, transform 0.12s ease;
  }
  .tile:hover {
    background: rgba(255, 255, 255, 0.85);
    border-color: rgba(37, 99, 235, 0.35);
    transform: translateY(-2px);
  }
  .tile-foto {
    width: 100%;
    aspect-ratio: 1 / 1;
    background: rgba(30, 41, 59, 0.06);
  }
  .tile-foto img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .tile-info {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    padding: 0.7rem 0.8rem 0.85rem;
  }
  .tile-nombre {
    color: #1e293b;
    font-weight: 600;
    font-size: 0.9rem;
    line-height: 1.3;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
  }
  .tile-meta {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }
  .tile-extra {
    color: rgba(30, 41, 59, 0.55);
    font-size: 0.72rem;
  }
  .tile-precio {
    color: #15803d;
    font-weight: 600;
    font-size: 0.85rem;
    margin-left: auto;
  }

  /* Modal */
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.45);
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
    max-width: 440px;
    background: #fff;
    border-radius: 16px;
    padding: 1.5rem;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);
    max-height: calc(100vh - 2rem);
    max-height: calc(100dvh - 2rem);
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
  }
  .modal h2 {
    margin: 0 0 1.1rem;
    font-size: 1.2rem;
    color: #1e293b;
  }
  .modal form {
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
  }
  .modal label {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    font-size: 0.85rem;
    color: rgba(30, 41, 59, 0.85);
  }
  .modal label em {
    color: rgba(30, 41, 59, 0.5);
    font-style: normal;
  }
  .modal input[type='text'],
  .modal input[type='number'] {
    width: 100%;
    box-sizing: border-box;
    padding: 0.65rem 0.85rem;
    font-size: 1rem;
    border: 1px solid rgba(0, 0, 0, 0.18);
    border-radius: 10px;
    outline: none;
    transition: border-color 0.18s ease, box-shadow 0.18s ease;
  }
  .modal input[type='text']:focus,
  .modal input[type='number']:focus {
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
  }
  .modal input[type='file'] {
    font-size: 0.85rem;
    color: rgba(30, 41, 59, 0.75);
  }
  .error {
    color: #dc2626;
    font-size: 0.85rem;
    margin: 0;
  }
  .acciones {
    display: flex;
    justify-content: flex-end;
    gap: 0.6rem;
    margin-top: 0.4rem;
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
