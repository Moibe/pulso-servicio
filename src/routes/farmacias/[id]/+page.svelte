<script lang="ts">
  import { portal } from '$lib/portal';
  import { enhance } from '$app/forms';
  import MapaUbicacion from '$lib/MapaUbicacion.svelte';
  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();

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
</script>

<svelte:window
  onkeydown={(e) => {
    if (e.key !== 'Escape') return;
    if (showSupModal) cerrarSup();
    if (showEmpModal) cerrarEmp();
  }}
/>

<section class="farmacia">
  <header class="head">
    <div class="titulos">
      <h1>{data.farmacia.nombre}</h1>
      {#if data.canManage}
        <a class="ajustes-link" href={`/farmacias/${data.farmacia.id}/settings`}>Ajustes y miembros</a>
      {/if}
    </div>
    {#if data.isAdmin}
      <div class="acciones">
        <button type="button" class="btn-nuevo" onclick={() => (showSupModal = true)}>
          {data.supervisorActual ? 'Cambiar Supervisor' : '+ Asignar Supervisor'}
        </button>
        <button type="button" class="btn-nuevo" onclick={() => (showEmpModal = true)}>
          + Agregar Empleado
        </button>
      </div>
    {/if}
  </header>

  {#if form?.personalError}<p class="err" role="alert">{form.personalError}</p>{/if}

  <div class="personal-grid">
    <!-- Supervisor: 1 por farmacia (el mismo puede llevar varias). -->
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
        <p class="card-vacio">
          {data.isAdmin ? 'Sin supervisor. Asígnalo con “Asignar Supervisor”.' : 'Sin supervisor asignado.'}
        </p>
      {/if}
    </div>

    <!-- Empleados: N por farmacia, cada uno en UNA sola a la vez. -->
    <div class="card">
      <span class="card-tit">Empleados <span class="cuenta">{data.empleados.length}</span></span>
      {#if data.empleados.length === 0}
        <p class="card-vacio">
          {data.isAdmin ? 'Sin empleados. Agrégalos con “Agregar Empleado”.' : 'Sin empleados en esta farmacia.'}
        </p>
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

  <!-- Ubicación: solo si la tiene puesta. Si no, al que puede administrarla se
       le dice dónde ponerla; a los demás no se les enseña un hueco vacío. -->
  {#if data.farmacia.lat != null && data.farmacia.lng != null}
    <div class="card">
      <span class="card-tit">Ubicación</span>
      <MapaUbicacion lat={data.farmacia.lat} lng={data.farmacia.lng} />
      <a
        class="ver-en-osm"
        href={`https://www.openstreetmap.org/?mlat=${data.farmacia.lat}&mlon=${data.farmacia.lng}#map=17/${data.farmacia.lat}/${data.farmacia.lng}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        Abrir en OpenStreetMap ↗
      </a>
    </div>
  {:else if data.canManage}
    <div class="card">
      <span class="card-tit">Ubicación</span>
      <p class="card-vacio">
        Sin ubicación en el mapa. Ponla desde
        <a href={`/farmacias/${data.farmacia.id}/settings`}>Ajustes</a>.
      </p>
    </div>
  {/if}
</section>

{#if showSupModal}
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div use:portal class="overlay" onclick={cerrarSup}>
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
        <div class="acciones-modal">
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
          <div class="acciones-modal">
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
  <div use:portal class="overlay" onclick={cerrarEmp}>
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
        <div class="acciones-modal">
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
            <div class="acciones-modal">
              <button type="submit" class="btn-ok ghost">Mover a esta farmacia</button>
            </div>
          </form>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .farmacia {
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
    gap: 0.15rem;
    min-width: 0;
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
  .acciones {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
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

  .personal-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr));
    gap: 0.85rem;
    /* Cada tarjeta se ajusta a su contenido: el supervisor (1 fila) no tiene
       por qué estirarse a la altura de la lista de empleados. */
    align-items: start;
  }
  .card {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    padding: 1rem 1.1rem;
    background: rgba(255, 255, 255, 0.55);
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 12px;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  }
  .card-tit {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #15803d;
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
    font-size: 0.88rem;
    color: rgba(30, 41, 59, 0.5);
  }
  .card-vacio a {
    color: #2563eb;
  }
  .ver-en-osm {
    align-self: flex-start;
    font-size: 0.78rem;
    color: rgba(30, 41, 59, 0.55);
    text-decoration: none;
  }
  .ver-en-osm:hover {
    color: #2563eb;
    text-decoration: underline;
  }
  .personas {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
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
    font-size: 0.95rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .avatar {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.75rem;
    height: 1.75rem;
    flex-shrink: 0;
    border-radius: 50%;
    background: rgba(37, 99, 235, 0.14);
    color: #1d4ed8;
    font-size: 0.78rem;
    font-weight: 700;
  }
  .avatar.sup {
    background: rgba(22, 163, 74, 0.16);
    color: #15803d;
  }
  .icon-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.8rem;
    height: 1.8rem;
    flex-shrink: 0;
    padding: 0;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 8px;
    color: rgba(30, 41, 59, 0.4);
    cursor: pointer;
    transition: background 0.18s ease, color 0.18s ease;
  }
  .icon-btn.quitar:hover {
    background: rgba(220, 38, 38, 0.1);
    color: #dc2626;
  }
  .err {
    margin: 0;
    font-size: 0.88rem;
    color: #dc2626;
  }

  /* Modales */
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
  .modal input[type='text'],
  .modal select {
    width: 100%;
    box-sizing: border-box;
    padding: 0.7rem 0.9rem;
    font: inherit;
    font-size: 1rem;
    color: #1e293b;
    background: #fff;
    border: 1px solid rgba(0, 0, 0, 0.18);
    border-radius: 10px;
    outline: none;
    transition: border-color 0.18s ease, box-shadow 0.18s ease;
  }
  .modal input[type='text']:focus,
  .modal select:focus {
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
  }
  .modal-nota {
    margin: 0 0 0.9rem;
    font-size: 0.85rem;
    color: rgba(30, 41, 59, 0.6);
  }
  .modal-nota a {
    color: #2563eb;
  }
  .error {
    color: #dc2626;
    font-size: 0.85rem;
    margin: 0.6rem 0 0;
  }
  .acciones-modal {
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
    font: inherit;
    font-size: 0.9rem;
    cursor: pointer;
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
    font: inherit;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(22, 163, 74, 0.35);
  }
  .btn-ok:hover {
    background: #15803d;
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
</style>
