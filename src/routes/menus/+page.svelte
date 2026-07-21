<script lang="ts">
  import { onMount } from 'svelte';
  import { enhance } from '$app/forms';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  function autofocusEdit(node: HTMLInputElement) {
    node.focus();
    node.select();
  }

  // Edición inline del nombre del menú.
  let editingId = $state<number | null>(null);
  let editValue = $state('');
  function startEdit(m: { id: number; nombre: string }) {
    editingId = m.id;
    editValue = m.nombre;
  }
  function cancelEdit() {
    editingId = null;
    editValue = '';
  }

  // Vista lista / mosaico, persistida en localStorage.
  const VIEW_STORAGE_KEY = 'menu:menus-view';
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

{#snippet editForm(m: { id: number })}
  <form
    method="POST"
    action="?/renombrarMenu"
    class="edit-form"
    use:enhance={() => {
      return async ({ result, update }) => {
        await update({ reset: false });
        if (result.type === 'success') cancelEdit();
      };
    }}
  >
    <input type="hidden" name="menuId" value={m.id} />
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

{#snippet pencil(m: { id: number; nombre: string })}
  <button
    type="button"
    class="icon-btn edit"
    onclick={() => startEdit(m)}
    aria-label="Editar nombre"
    title="Editar nombre"
  >
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
  </button>
{/snippet}

<section class="lista-wrap">
  <header class="head">
    <h1>Menus</h1>
    {#if data.menus.length > 0}
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

  {#if data.menus.length === 0}
    <p class="vacio">Aún no hay menús. Crea uno desde la página de un negocio.</p>
  {:else if viewMode === 'mosaic'}
    <ul class="mosaic">
      {#each data.menus as m (m.id)}
        <li class="tile" class:editing={editingId === m.id}>
          {#if editingId === m.id}
            {@render editForm(m)}
          {:else}
            <a class="tile-nombre-link" href={`/menus/${m.id}`}>
              <span class="tile-nombre">{m.nombre}</span>
            </a>
            <span class="tile-ctx">{m.negocioNombre}</span>
            {#if m.canManage}{@render pencil(m)}{/if}
          {/if}
        </li>
      {/each}
    </ul>
  {:else}
    <ul class="lista">
      {#each data.menus as m (m.id)}
        <li class="item" class:editing={editingId === m.id}>
          {#if editingId === m.id}
            {@render editForm(m)}
          {:else}
            <a class="item-link" href={`/menus/${m.id}`}>
              <span class="item-nombre">{m.nombre}</span>
            </a>
            <span class="item-ctx">{m.negocioNombre}</span>
            {#if m.canManage}{@render pencil(m)}{/if}
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
  .item-ctx {
    color: rgba(30, 41, 59, 0.55);
    font-size: 0.8rem;
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
  .tile-ctx {
    color: rgba(30, 41, 59, 0.5);
    font-size: 0.72rem;
  }
  .tile .icon-btn.edit {
    position: absolute;
    top: 0.4rem;
    right: 0.4rem;
  }
  .tile .edit-form {
    width: 100%;
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
</style>
