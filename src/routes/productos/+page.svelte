<script lang="ts">
  import { onMount } from 'svelte';
  import { enhance } from '$app/forms';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const fmtPrecio = (n: number | null) =>
    n == null ? '' : n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

  // Vista lista / mosaico, persistida en localStorage (mismo patrón que estudio-cine).
  const VIEW_STORAGE_KEY = 'menu:productos-view';
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

  function autofocusEdit(node: HTMLInputElement) {
    node.focus();
    node.select();
  }

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
</script>

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

<section class="lista-wrap">
  <header class="head">
    <h1>Productos</h1>
    {#if data.productos.length > 0}
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
    {/if}
  </header>

  {#if data.productos.length === 0}
    <p class="vacio">Aún no hay productos. Agrega uno desde la página de un menú.</p>
  {:else if viewMode === 'mosaic'}
    <ul class="mosaic">
      {#each data.productos as p (p.id)}
        <li class="tile" class:editing={editingId === p.id}>
          <a class="tile-foto" href={`/menus/${p.menuId}`}>
            {#if p.fotoPrincipal}
              <img src={p.fotoPrincipal} alt={p.nombre} />
            {:else}
              <span class="sin-foto" aria-hidden="true"></span>
            {/if}
          </a>
          <div class="tile-info">
            {#if editingId === p.id}
              {@render editForm(p)}
            {:else}
              <a class="tile-nombre-link" href={`/menus/${p.menuId}`}>
                <span class="tile-nombre">{p.nombre}</span>
              </a>
              <span class="tile-ctx">{p.negocioNombre} · {p.menuNombre}</span>
              <div class="tile-meta">
                {#if p.precio != null}<span class="tile-precio">{fmtPrecio(p.precio)}</span>{/if}
                {#if p.canManage}{@render pencil(p)}{/if}
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
            <a class="item-link" href={`/menus/${p.menuId}`}>
              <span class="item-nombre">{p.nombre}</span>
              <span class="item-ctx">{p.negocioNombre} · {p.menuNombre}</span>
            </a>
            {#if p.precio != null}<span class="item-precio">{fmtPrecio(p.precio)}</span>{/if}
            {#if p.canManage}{@render pencil(p)}{/if}
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</section>

<style>
  .lista-wrap {
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
  .vacio {
    color: rgba(30, 41, 59, 0.65);
    font-size: 0.95rem;
    margin: 0;
  }

  /* Toggle lista / mosaico */
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

  /* Placeholder sin foto (compartido lista/mosaico) */
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

  /* Edición inline (compartida lista/mosaico) */
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

  /* Vista lista */
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
    transition: background 0.18s ease, border-color 0.18s ease;
  }
  .item:hover {
    background: rgba(255, 255, 255, 0.8);
    border-color: rgba(37, 99, 235, 0.35);
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
  .item-link {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    flex: 1;
    min-width: 0;
    text-decoration: none;
  }
  .item-nombre {
    color: #1e293b;
    font-weight: 500;
  }
  .item-ctx {
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
    transition: background 0.18s ease, border-color 0.18s ease;
  }
  .tile:hover {
    background: rgba(255, 255, 255, 0.85);
    border-color: rgba(37, 99, 235, 0.35);
  }
  .tile-foto {
    display: block;
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
    gap: 0.15rem;
    padding: 0.7rem 0.8rem 0.85rem;
  }
  .tile-nombre-link {
    text-decoration: none;
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
  .tile-ctx {
    color: rgba(30, 41, 59, 0.55);
    font-size: 0.72rem;
  }
  .tile-meta {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    margin-top: 0.15rem;
  }
  .tile-meta .icon-btn {
    margin-left: auto;
  }
  .tile-precio {
    color: #15803d;
    font-weight: 600;
    font-size: 0.85rem;
  }
</style>
