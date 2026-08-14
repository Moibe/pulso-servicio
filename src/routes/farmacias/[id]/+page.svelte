<script lang="ts">
  import { onMount } from 'svelte';
  import { enhance } from '$app/forms';
  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let showModal = $state(false);
  let nombre = $state('');

  function abrir() {
    showModal = true;
  }
  function cerrar() {
    showModal = false;
    nombre = '';
  }

  // Modales de personal (supervisor / empleado).
  let showSupModal = $state(false);
  let showEmpModal = $state(false);
  function cerrarSup() {
    showSupModal = false;
  }
  function cerrarEmp() {
    showEmpModal = false;
  }

  function autofocus(node: HTMLInputElement) {
    node.focus();
  }
  function autofocusEdit(node: HTMLInputElement) {
    node.focus();
    node.select();
  }

  const fmtFecha = (d: Date | string | number) =>
    new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });

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
  const VIEW_STORAGE_KEY = 'menu:farmacia-menus-view';
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
    if (e.key !== 'Escape') return;
    if (showModal) cerrar();
    if (showSupModal) cerrarSup();
    if (showEmpModal) cerrarEmp();
  }}
/>

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
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
    </button>
    <button type="button" class="icon-btn" onclick={cancelEdit} aria-label="Cancelar" title="Cancelar">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
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
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
  </button>
{/snippet}

<section class="menus">
  <header class="head">
    <div class="titulos">
      <h1>{data.farmacia.nombre}</h1>
      {#if data.canManage}
        <a class="ajustes-link" href={`/farmacias/${data.farmacia.id}/settings`}>Ajustes y miembros</a>
      {/if}
    </div>
    {#if data.canManage}
      <button type="button" class="btn-nuevo" onclick={abrir}>+ Agregar Menu</button>
    {/if}
  </header>

  <!-- ── Personal: supervisor (1) + empleados (N) ── -->
  <section class="personal">
    <div class="personal-head">
      <h2>Personal</h2>
      {#if data.isAdmin}
        <div class="personal-acciones">
          <button type="button" class="btn-nuevo sm" onclick={() => (showSupModal = true)}>
            {data.supervisorActual ? 'Cambiar Supervisor' : '+ Asignar Supervisor'}
          </button>
          <button type="button" class="btn-nuevo sm" onclick={() => (showEmpModal = true)}>
            + Agregar Empleado
          </button>
        </div>
      {/if}
    </div>

    {#if form?.personalError}<p class="err" role="alert">{form.personalError}</p>{/if}

    <div class="personal-grid">
      <!-- Supervisor -->
      <div class="card">
        <span class="card-tit">Supervisor</span>
        {#if data.supervisorActual}
          <div class="persona">
            <span class="avatar sup" aria-hidden="true">
              {data.supervisorActual.nombre.trim().slice(0, 1).toUpperCase()}
            </span>
            <span class="persona-nombre">{data.supervisorActual.nombre}</span>
            {#if data.isAdmin}
              <form method="POST" action="?/asignarSupervisor" use:enhance>
                <input type="hidden" name="supervisorId" value="" />
                <button type="submit" class="icon-btn quitar" aria-label="Quitar supervisor" title="Quitar supervisor">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              </form>
            {/if}
          </div>
        {:else}
          <p class="card-vacio">Sin supervisor asignado.</p>
        {/if}
      </div>

      <!-- Empleados -->
      <div class="card">
        <span class="card-tit">Empleados <span class="cuenta">{data.empleados.length}</span></span>
        {#if data.empleados.length === 0}
          <p class="card-vacio">Sin empleados en esta farmacia.</p>
        {:else}
          <ul class="personas">
            {#each data.empleados as e (e.id)}
              <li class="persona">
                <span class="avatar" aria-hidden="true">{e.nombre.trim().slice(0, 1).toUpperCase()}</span>
                <span class="persona-nombre">{e.nombre}</span>
                {#if data.isAdmin}
                  <form
                    method="POST"
                    action="?/quitarEmpleado"
                    use:enhance
                    onsubmit={(ev) => {
                      if (!confirm(`¿Quitar a "${e.nombre}" de esta farmacia? No se borra: queda sin asignar.`))
                        ev.preventDefault();
                    }}
                  >
                    <input type="hidden" name="empleadoId" value={e.id} />
                    <button type="submit" class="icon-btn quitar" aria-label="Quitar de la farmacia" title="Quitar de la farmacia">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
                  </form>
                {/if}
              </li>
            {/each}
          </ul>
        {/if}
      </div>
    </div>
  </section>

  {#if data.menus.length === 0}
    <p class="vacio">
      {data.canManage
        ? 'Aún no hay menús. Crea el primero con “Agregar Menu”.'
        : 'Esta farmacia todavía no tiene menús.'}
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
        {#each data.menus as m (m.id)}
          <li class="tile" class:editing={editingId === m.id}>
            {#if editingId === m.id}
              {@render editForm(m)}
            {:else}
              <a class="tile-nombre-link" href={`/menus/${m.id}`}>
                <span class="tile-nombre">{m.nombre}</span>
              </a>
              {#if m.creadoEn}<span class="tile-fecha">{fmtFecha(m.creadoEn)}</span>{/if}
              {#if data.canManage}{@render pencil(m)}{/if}
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
              {#if m.creadoEn}<span class="item-fecha">{fmtFecha(m.creadoEn)}</span>{/if}
              {#if data.canManage}{@render pencil(m)}{/if}
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
  {/if}
</section>

{#if showSupModal}
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div class="overlay" onclick={cerrarSup}>
    <div
      class="modal"
      role="dialog"
      tabindex="-1"
      aria-modal="true"
      aria-label="Asignar supervisor"
      onclick={(e) => e.stopPropagation()}
    >
      <h2>Supervisor de la farmacia</h2>
      {#if data.supervisores.length === 0}
        <p class="modal-nota">
          Todavía no hay supervisores dados de alta. Créalos en <a href="/supervisores">Supervisores</a>.
        </p>
        <div class="acciones">
          <button type="button" class="btn-cancelar" onclick={cerrarSup}>Cerrar</button>
        </div>
      {:else}
        <p class="modal-nota">Un supervisor puede supervisar varias farmacias.</p>
        <form
          method="POST"
          action="?/asignarSupervisor"
          use:enhance={() => async ({ result, update }) => {
            await update();
            if (result.type === 'success') cerrarSup();
          }}
        >
          <select name="supervisorId" value={data.farmacia.supervisorId ?? ''}>
            <option value="">— Sin supervisor —</option>
            {#each data.supervisores as s (s.id)}<option value={s.id}>{s.nombre}</option>{/each}
          </select>
          {#if form?.personalError}<p class="error">{form.personalError}</p>{/if}
          <div class="acciones">
            <button type="button" class="btn-cancelar" onclick={cerrarSup}>Cancelar</button>
            <button type="submit" class="btn-ok">Guardar</button>
          </div>
        </form>
      {/if}
    </div>
  </div>
{/if}

{#if showEmpModal}
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div class="overlay" onclick={cerrarEmp}>
    <div
      class="modal"
      role="dialog"
      tabindex="-1"
      aria-modal="true"
      aria-label="Agregar empleado"
      onclick={(e) => e.stopPropagation()}
    >
      <h2>Agregar empleado</h2>

      <form
        method="POST"
        action="?/crearEmpleado"
        use:enhance={() => async ({ result, update }) => {
          await update();
          if (result.type === 'success') cerrarEmp();
        }}
      >
        <input use:autofocus type="text" name="nombre" placeholder="Nombre del empleado" autocomplete="off" />
        {#if form?.personalError}<p class="error">{form.personalError}</p>{/if}
        <div class="acciones">
          <button type="button" class="btn-cancelar" onclick={cerrarEmp}>Cancelar</button>
          <button type="submit" class="btn-ok">Crear</button>
        </div>
      </form>

      <!-- Alternativa: traerse a alguien que hoy no está en ninguna farmacia. -->
      {#if data.empleadosLibres.length > 0}
        <div class="modal-alt">
          <span class="alt-sep">o mover uno existente</span>
          <form
            method="POST"
            action="?/asignarEmpleado"
            use:enhance={() => async ({ result, update }) => {
              await update();
              if (result.type === 'success') cerrarEmp();
            }}
          >
            <select name="empleadoId">
              {#each data.empleadosLibres as e (e.id)}<option value={e.id}>{e.nombre}</option>{/each}
            </select>
            <div class="acciones">
              <button type="submit" class="btn-ok ghost">Mover a esta farmacia</button>
            </div>
          </form>
        </div>
      {/if}
    </div>
  </div>
{/if}

{#if showModal}
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div class="overlay" onclick={cerrar}>
    <div
      class="modal"
      role="dialog"
      tabindex="-1"
      aria-modal="true"
      aria-label="Nuevo menú"
      onclick={(e) => e.stopPropagation()}
    >
      <h2>Nuevo menú</h2>
      <form
        method="POST"
        action="?/agregarMenu"
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
          placeholder="Nombre del menú"
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

<style>
  .menus {
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
  .titulos {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }
  h1 {
    margin: 0;
    font-size: 1.5rem;
    color: #1e293b;
  }
  .ajustes-link {
    font-size: 0.8rem;
    color: rgba(30, 41, 59, 0.55);
    text-decoration: none;
  }
  .ajustes-link:hover {
    color: #2563eb;
    text-decoration: underline;
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
  .btn-nuevo.sm {
    padding: 0.45rem 0.85rem;
    font-size: 0.85rem;
  }

  /* ── Personal (supervisor + empleados) ── */
  .personal {
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
    padding: 1rem 1.1rem 1.1rem;
    background: rgba(255, 255, 255, 0.4);
    border: 1px solid rgba(0, 0, 0, 0.07);
    border-radius: 14px;
  }
  .personal-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    flex-wrap: wrap;
  }
  .personal h2 {
    margin: 0;
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: #15803d;
  }
  .personal-acciones {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .personal-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr));
    gap: 0.7rem;
    /* Cada tarjeta se ajusta a su contenido: el supervisor (1 fila) no tiene
       por qué estirarse a la altura de la lista de empleados. */
    align-items: start;
  }
  .card {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.8rem 0.9rem;
    background: rgba(255, 255, 255, 0.6);
    border: 1px solid rgba(0, 0, 0, 0.07);
    border-radius: 12px;
  }
  .card-tit {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: rgba(30, 41, 59, 0.55);
  }
  .cuenta {
    font-size: 0.68rem;
    background: rgba(0, 0, 0, 0.07);
    color: rgba(30, 41, 59, 0.7);
    border-radius: 999px;
    padding: 0.05rem 0.4rem;
    letter-spacing: 0;
  }
  .card-vacio {
    margin: 0;
    font-size: 0.85rem;
    font-style: italic;
    color: rgba(30, 41, 59, 0.45);
  }
  .personas {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }
  .persona {
    display: flex;
    align-items: center;
    gap: 0.55rem;
  }
  .persona-nombre {
    flex: 1;
    min-width: 0;
    color: #1e293b;
    font-weight: 500;
    font-size: 0.92rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .avatar {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.65rem;
    height: 1.65rem;
    flex-shrink: 0;
    border-radius: 50%;
    background: rgba(37, 99, 235, 0.14);
    color: #1d4ed8;
    font-size: 0.75rem;
    font-weight: 700;
  }
  .avatar.sup {
    background: rgba(22, 163, 74, 0.16);
    color: #15803d;
  }
  .icon-btn.quitar {
    color: rgba(30, 41, 59, 0.4);
    width: 1.7rem;
    height: 1.7rem;
  }
  .icon-btn.quitar:hover {
    background: rgba(220, 38, 38, 0.1);
    color: #dc2626;
  }
  .err {
    margin: 0;
    font-size: 0.85rem;
    color: #dc2626;
  }
  .modal-nota {
    margin: 0 0 0.9rem;
    font-size: 0.85rem;
    color: rgba(30, 41, 59, 0.6);
  }
  .modal-nota a {
    color: #2563eb;
  }
  .modal select {
    width: 100%;
    box-sizing: border-box;
    padding: 0.65rem 0.8rem;
    font: inherit;
    font-size: 1rem;
    color: #1e293b;
    background: #fff;
    border: 1px solid rgba(0, 0, 0, 0.18);
    border-radius: 10px;
    outline: none;
  }
  .modal select:focus {
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
  }
  .modal-alt {
    margin-top: 1.1rem;
    padding-top: 0.9rem;
    border-top: 1px solid rgba(0, 0, 0, 0.08);
  }
  .alt-sep {
    display: block;
    margin-bottom: 0.6rem;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: rgba(30, 41, 59, 0.45);
  }
  .btn-ok.ghost {
    background: transparent;
    color: #2563eb;
    border: 1px solid rgba(37, 99, 235, 0.4);
    box-shadow: none;
  }
  .btn-ok.ghost:hover {
    background: rgba(37, 99, 235, 0.08);
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
    color: rgba(30, 41, 59, 0.45);
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
