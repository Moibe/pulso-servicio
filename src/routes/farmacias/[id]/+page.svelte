<script lang="ts">
  import { untrack } from 'svelte';
  import { enhance } from '$app/forms';
  import { portal } from '$lib/portal';
  import ConfirmDialog from '$lib/ConfirmDialog.svelte';
  import MapaUbicacion from '$lib/MapaUbicacion.svelte';
  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();
  const farmacia = $derived(data.farmacia);

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

  // Renombrar en línea, sobre el propio título.
  let editandoNombre = $state(false);
  let nombreDraft = $state('');
  function empezarEdicionNombre() {
    nombreDraft = farmacia.nombre;
    editandoNombre = true;
  }
  function cancelarEdicionNombre() {
    editandoNombre = false;
  }

  // Borrar la farmacia y quitar un empleado: confirmación con el modal del sitio.
  let showBorrarFarmacia = $state(false);
  let borrarFarmaciaFormEl: HTMLFormElement;
  let pendingQuitar = $state<{ id: number; nombre: string } | null>(null);
  let quitarEmpleadoFormEl: HTMLFormElement;

  // Ubicación "en borrador": lo que se va marcando en el mapa antes de guardar.
  // La fuente de verdad sigue siendo el servidor; cuando responde (y `data` se
  // revalida) el borrador se vuelve a igualar a lo guardado.
  // untrack: leer `data` aquí es a propósito (es solo el valor inicial); quien
  // lo mantiene al día es el $effect de abajo.
  let borrador = $state<{ lat: number | null; lng: number | null }>(
    untrack(() => ({ lat: data.farmacia.lat, lng: data.farmacia.lng }))
  );
  $effect(() => {
    const { lat, lng } = data.farmacia;
    borrador = { lat, lng };
  });

  const ubicacionSinGuardar = $derived(
    borrador.lat !== farmacia.lat || borrador.lng !== farmacia.lng
  );
  const fmtCoord = (n: number) => n.toFixed(6);
  const osmUrl = $derived(
    farmacia.lat != null && farmacia.lng != null
      ? `https://www.openstreetmap.org/?mlat=${farmacia.lat}&mlon=${farmacia.lng}#map=17/${farmacia.lat}/${farmacia.lng}`
      : null
  );
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
      {#if editandoNombre}
        <form
          method="POST"
          action="?/renombrar"
          class="nombre-form"
          use:enhance={() => async ({ result, update }) => {
            await update({ reset: false });
            if (result.type === 'success') cancelarEdicionNombre();
          }}
        >
          <input
            use:autofocusEdit
            class="nombre-input"
            name="nombre"
            bind:value={nombreDraft}
            autocomplete="off"
            aria-label="Nombre de la farmacia"
            onkeydown={(e) => {
              if (e.key === 'Escape') cancelarEdicionNombre();
            }}
          />
          <button type="submit" class="icon-btn save" aria-label="Guardar nombre" title="Guardar nombre">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          </button>
          <button type="button" class="icon-btn" onclick={cancelarEdicionNombre} aria-label="Cancelar" title="Cancelar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </form>
      {:else}
        <div class="titulo-row">
          <h1>{farmacia.nombre}</h1>
          {#if data.canManage}
            <button
              type="button"
              class="icon-btn edit"
              onclick={empezarEdicionNombre}
              aria-label="Renombrar farmacia"
              title="Renombrar farmacia"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
            </button>
          {/if}
        </div>
      {/if}
      {#if form?.nombreError}<span class="err" role="alert">{form.nombreError}</span>{/if}
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
                <button
                  type="button"
                  class="icon-btn quitar"
                  onclick={() => (pendingQuitar = e)}
                  aria-label="Quitar de la farmacia"
                  title="Quitar de la farmacia"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              {/if}
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  </div>

  <!-- Ubicación. Quien administra la edita aquí mismo; a los demás se les
       enseña solo si está puesta (no tiene sentido un hueco vacío). -->
  {#if data.canManage}
    <div class="card">
      <span class="card-tit">Ubicación</span>
      <p class="card-hint">
        Haz clic en el mapa para poner el pin donde está la farmacia; puedes arrastrarlo para
        ajustarlo. Acércate con los botones + / − del mapa.
      </p>

      <MapaUbicacion
        lat={borrador.lat}
        lng={borrador.lng}
        editable
        onPick={(p) => (borrador = { lat: p.lat, lng: p.lng })}
      />

      <div class="ubic-barra">
        {#if borrador.lat != null && borrador.lng != null}
          <span class="coords">{fmtCoord(borrador.lat)}, {fmtCoord(borrador.lng)}</span>
        {:else}
          <span class="coords sin">Sin ubicación</span>
        {/if}

        <form method="POST" action="?/setUbicacion" class="ubic-form" use:enhance>
          <input type="hidden" name="lat" value={borrador.lat ?? ''} />
          <input type="hidden" name="lng" value={borrador.lng ?? ''} />
          <button class="btn primary sm" type="submit" disabled={!ubicacionSinGuardar}>
            {ubicacionSinGuardar ? 'Guardar ubicación' : 'Ubicación guardada'}
          </button>
        </form>

        {#if farmacia.lat != null}
          <!-- Quitar la ubicación no borra nada irreversible: se vuelve a marcar
               en el mapa cuando se quiera, por eso no lleva modal de confirmación. -->
          <form method="POST" action="?/setUbicacion" use:enhance>
            <input type="hidden" name="lat" value="" />
            <input type="hidden" name="lng" value="" />
            <button class="btn ghost sm" type="submit">Quitar ubicación</button>
          </form>
        {/if}
      </div>
      {#if osmUrl}
        <a class="ver-en-osm" href={osmUrl} target="_blank" rel="noopener noreferrer">
          Abrir en OpenStreetMap ↗
        </a>
      {/if}
      {#if form?.ubicacionError}<span class="err" role="alert">{form.ubicacionError}</span>{/if}
      {#if form?.ubicacionGuardada}<span class="ok" role="status">Ubicación actualizada.</span>{/if}
      {#if form?.ubicacionQuitada}<span class="ok" role="status">Ubicación quitada.</span>{/if}
    </div>
  {:else if farmacia.lat != null && farmacia.lng != null}
    <div class="card">
      <span class="card-tit">Ubicación</span>
      <MapaUbicacion lat={farmacia.lat} lng={farmacia.lng} />
      {#if osmUrl}
        <a class="ver-en-osm" href={osmUrl} target="_blank" rel="noopener noreferrer">
          Abrir en OpenStreetMap ↗
        </a>
      {/if}
    </div>
  {/if}

  {#if data.canManage}
    <!-- Miembros: quién (no-admin) puede ver esta farmacia. -->
    <div class="card">
      <span class="card-tit">Miembros</span>
      <p class="card-hint">
        Quiénes (no-admins) pueden ver esta farmacia. Los administradores la ven siempre.
      </p>

      {#if data.members.length === 0}
        <p class="card-vacio">Sin miembros asignados todavía.</p>
      {:else}
        <ul class="member-list">
          {#each data.members as m (m.id)}
            <li>
              <span class="mname">
                {m.username}{#if m.isAdmin}<span class="tag">admin</span>{/if}{#if m.rol === 'owner'}<span
                    class="tag owner">dueño</span
                  >{/if}
              </span>
              <form method="POST" action="?/removeMember" use:enhance>
                <input type="hidden" name="usuarioId" value={m.id} />
                <button class="btn danger sm" type="submit">Quitar</button>
              </form>
            </li>
          {/each}
        </ul>
      {/if}

      {#if data.candidates.length > 0}
        <form method="POST" action="?/addMember" class="add-member" use:enhance>
          <label class="sr-only" for="usuarioId">Usuario</label>
          <select id="usuarioId" name="usuarioId">
            {#each data.candidates as c (c.id)}<option value={c.id}>{c.username}</option>{/each}
          </select>
          <button class="btn primary sm" type="submit">Agregar miembro</button>
        </form>
      {:else}
        <p class="card-vacio">No hay más usuarios para agregar.</p>
      {/if}
      {#if form?.memberError}<span class="err" role="alert">{form.memberError}</span>{/if}
    </div>

    <div class="danger-zone">
      <span class="dz-tit">Borrar</span>
      <button class="btn danger" type="button" onclick={() => (showBorrarFarmacia = true)}>
        Borrar farmacia
      </button>
      <p class="dz-hint">
        Permanente. Sus empleados no se borran: quedan sin asignar y puedes moverlos a otra farmacia.
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

<!-- Forms ocultos: solo hay una acción pendiente a la vez, así que no hace
     falta un form por fila. -->
<form
  method="POST"
  action="?/borrar"
  bind:this={borrarFarmaciaFormEl}
  use:enhance
  class="hidden-form"
></form>

<form
  method="POST"
  action="?/quitarEmpleado"
  bind:this={quitarEmpleadoFormEl}
  use:enhance={() => async ({ update }) => {
    await update();
  }}
  class="hidden-form"
>
  <input type="hidden" name="empleadoId" value={pendingQuitar?.id ?? ''} />
</form>

<ConfirmDialog
  open={showBorrarFarmacia}
  title="Borrar farmacia"
  message={`¿Borrar "${farmacia.nombre}"? Es permanente. Sus empleados no se borran: quedan sin asignar.`}
  onConfirm={() => {
    showBorrarFarmacia = false;
    borrarFarmaciaFormEl.requestSubmit();
  }}
  onCancel={() => (showBorrarFarmacia = false)}
/>

<!-- Quitar no es borrar: el empleado sigue existiendo, solo queda sin farmacia. -->
<ConfirmDialog
  open={pendingQuitar !== null}
  title="Quitar de la farmacia"
  message={pendingQuitar
    ? `¿Quitar a "${pendingQuitar.nombre}" de esta farmacia? No se borra: queda sin asignar y puedes moverlo a otra.`
    : ''}
  confirmLabel="Quitar"
  onConfirm={() => {
    quitarEmpleadoFormEl.requestSubmit();
    pendingQuitar = null;
  }}
  onCancel={() => (pendingQuitar = null)}
/>

<style>
  .hidden-form {
    display: none;
  }
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
    /* 1 1 auto, no `flex: 1`: en Safari <= 17 un hijo con flex-basis 0% no
       cuenta para la altura de un contenedor que se dimensiona por contenido,
       y el título se colapsaría (ver CLAUDE.md). */
    flex: 1 1 auto;
  }
  .titulo-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
  }
  h1 {
    margin: 0;
    font-size: 1.5rem;
    color: #1e293b;
    /* Sin flex-grow: si creciera, su caja llenaría el espacio libre y empujaría
       el lápiz lejos del texto visible. */
    flex: 0 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .nombre-form {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    min-width: 0;
    max-width: 100%;
  }
  .nombre-input {
    flex: 0 1 22rem;
    min-width: 0;
    box-sizing: border-box;
    font: inherit;
    font-size: 1.35rem;
    font-weight: 600;
    color: #1e293b;
    padding: 0.3rem 0.55rem;
    border: 1px solid rgba(37, 99, 235, 0.5);
    border-radius: 10px;
    outline: none;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
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
  .card-hint {
    margin: -0.2rem 0 0;
    font-size: 0.82rem;
    color: rgba(30, 41, 59, 0.55);
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
    /* Ver la nota de .titulos: flex-basis auto por el bug de Safari <= 17. */
    flex: 1 1 auto;
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
    box-sizing: border-box;
    width: 1.8rem;
    height: 1.8rem;
    flex-shrink: 0;
    padding: 0;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 8px;
    color: rgba(30, 41, 59, 0.4);
    cursor: pointer;
    transition: background 0.18s ease, color 0.18s ease, border-color 0.18s ease;
  }
  .icon-btn.quitar:hover {
    background: rgba(220, 38, 38, 0.1);
    color: #dc2626;
  }
  .icon-btn.edit {
    color: #2563eb;
    border-color: rgba(37, 99, 235, 0.25);
  }
  .icon-btn.edit:hover {
    background: rgba(37, 99, 235, 0.12);
    border-color: rgba(37, 99, 235, 0.45);
  }
  .icon-btn.save {
    color: #16a34a;
  }
  .icon-btn.save:hover {
    background: rgba(22, 163, 74, 0.12);
    color: #15803d;
  }

  /* Ubicación */
  .ubic-barra {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    flex-wrap: wrap;
  }
  .ubic-form {
    /* Los botones a la derecha; las coordenadas se quedan pegadas al margen. */
    margin-left: auto;
  }
  .coords {
    font-size: 0.8rem;
    font-variant-numeric: tabular-nums;
    color: rgba(30, 41, 59, 0.7);
    background: rgba(0, 0, 0, 0.05);
    border-radius: 8px;
    padding: 0.3rem 0.6rem;
  }
  .coords.sin {
    font-style: italic;
    color: rgba(30, 41, 59, 0.45);
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

  /* Miembros */
  .member-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }
  .member-list li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.5rem 0.8rem;
    background: rgba(255, 255, 255, 0.55);
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 8px;
  }
  .mname {
    font-weight: 600;
    color: #1e293b;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .mname .tag {
    font-size: 0.64rem;
    font-weight: 700;
    text-transform: uppercase;
    color: #15803d;
    background: rgba(22, 163, 74, 0.12);
    border: 1px solid rgba(22, 163, 74, 0.3);
    border-radius: 999px;
    padding: 0.05rem 0.4rem;
  }
  .mname .tag.owner {
    color: #2563eb;
    background: rgba(37, 99, 235, 0.12);
    border-color: rgba(37, 99, 235, 0.3);
  }
  .add-member {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .add-member select {
    font: inherit;
    font-size: 0.95rem;
    color: #1e293b;
    background: #ffffff;
    border: 1px solid rgba(0, 0, 0, 0.18);
    border-radius: 10px;
    padding: 0.5rem 0.7rem;
    min-width: 160px;
  }

  /* Zona de borrado */
  .danger-zone {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.6rem;
    padding-top: 1.1rem;
    border-top: 1px solid rgba(0, 0, 0, 0.08);
  }
  .dz-tit {
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #b91c1c;
  }
  .dz-hint {
    margin: 0;
    font-size: 0.82rem;
    color: rgba(30, 41, 59, 0.55);
  }

  /* Botones compartidos */
  .btn {
    font: inherit;
    font-weight: 600;
    padding: 0.6rem 1.1rem;
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
    color: #ffffff;
  }
  .btn.primary:hover {
    background: #1d4ed8;
  }
  .btn.primary:disabled {
    background: rgba(30, 41, 59, 0.18);
    box-shadow: none;
    cursor: default;
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
    margin: 0;
    font-size: 0.85rem;
    color: #dc2626;
  }
  .ok {
    font-size: 0.78rem;
    color: #15803d;
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
