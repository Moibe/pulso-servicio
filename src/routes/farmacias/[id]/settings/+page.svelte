<script lang="ts">
  import { untrack } from 'svelte';
  import { enhance } from '$app/forms';
  import ConfirmDialog from '$lib/ConfirmDialog.svelte';
  import MapaUbicacion from '$lib/MapaUbicacion.svelte';
  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();
  const farmacia = $derived(data.farmacia);

  let showDeleteConfirm = $state(false);
  let deleteFormEl: HTMLFormElement;

  // Ubicación "en borrador": lo que el usuario va marcando en el mapa antes de
  // guardar. La fuente de verdad sigue siendo el servidor; cuando responde (y
  // `data` se revalida) el borrador se vuelve a igualar a lo guardado.
  // untrack: leer `data` aquí es a propósito (es solo el valor inicial); quien
  // lo mantiene al día es el $effect de abajo.
  let borrador = $state<{ lat: number | null; lng: number | null }>(
    untrack(() => ({ lat: data.farmacia.lat, lng: data.farmacia.lng }))
  );
  $effect(() => {
    const { lat, lng } = data.farmacia;
    borrador = { lat, lng };
  });

  const sinGuardar = $derived(
    borrador.lat !== farmacia.lat || borrador.lng !== farmacia.lng
  );
  const fmtCoord = (n: number) => n.toFixed(6);
</script>

<div class="wrap">
  <a class="back" href="/farmacias/{farmacia.id}">← Volver</a>
  <h1>Ajustes de farmacia</h1>

  <form method="POST" action="?/rename" use:enhance>
    <div class="field">
      <label for="nombre">Nombre</label>
      <input id="nombre" name="nombre" type="text" value={farmacia.nombre} />
      {#if form?.nameError}<span class="err" role="alert">{form.nameError}</span>{/if}
    </div>
    <div class="actions">
      <a class="btn ghost" href="/farmacias/{farmacia.id}">Cancelar</a>
      <button class="btn primary" type="submit">Guardar</button>
    </div>
  </form>

  <div class="members">
    <h2>Ubicación</h2>
    <p class="hint">
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
        <button class="btn primary sm" type="submit" disabled={!sinGuardar}>
          {sinGuardar ? 'Guardar ubicación' : 'Ubicación guardada'}
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
    {#if form?.ubicacionError}<span class="err" role="alert">{form.ubicacionError}</span>{/if}
    {#if form?.ubicacionGuardada}<span class="ok" role="status">Ubicación actualizada.</span>{/if}
    {#if form?.ubicacionQuitada}<span class="ok" role="status">Ubicación quitada.</span>{/if}
  </div>

  <div class="members">
    <h2>Personal</h2>
    <!-- Los enlaces a /supervisores y /empleados solo para admin: esas rutas
         redirigen al home a quien no lo sea, así que a un owner no-admin le
         rebotarían. -->
    <p class="hint">
      Supervisor y empleados de esta farmacia. Es personal, no cuentas de acceso; lo da de alta el
      administrador{#if data.isAdmin} desde <a href="/supervisores">Supervisores</a> y
        <a href="/empleados">Empleados</a>{/if}.
    </p>

    {#if data.isAdmin}
      <form method="POST" action="?/setSupervisor" class="add-member" use:enhance>
        <label class="sr-only" for="supervisorId">Supervisor</label>
        <select id="supervisorId" name="supervisorId" value={farmacia.supervisorId ?? ''}>
          <option value="">— Sin supervisor —</option>
          {#each data.supervisores as s (s.id)}<option value={s.id}>{s.nombre}</option>{/each}
        </select>
        <button class="btn primary sm" type="submit">Guardar supervisor</button>
      </form>
      {#if form?.supervisorError}<span class="err" role="alert">{form.supervisorError}</span>{/if}
      {#if form?.supervisorSet}<span class="ok" role="status">Supervisor actualizado.</span>{/if}
    {:else}
      <p class="empty-note">
        Supervisor: {data.supervisorActual?.nombre ?? 'sin asignar'}
      </p>
    {/if}

    {#if data.empleados.length === 0}
      <p class="empty-note">Sin empleados asignados a esta farmacia.</p>
    {:else}
      <ul class="member-list">
        {#each data.empleados as e (e.id)}
          <li><span class="mname">{e.nombre}</span></li>
        {/each}
      </ul>
    {/if}
  </div>

  <div class="members">
    <h2>Miembros</h2>
    <p class="hint">Quiénes (no-admins) pueden ver esta farmacia. Los administradores la ven siempre.</p>

    {#if data.members.length === 0}
      <p class="empty-note">Sin miembros asignados todavía.</p>
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
        <select name="usuarioId">
          {#each data.candidates as c (c.id)}<option value={c.id}>{c.username}</option>{/each}
        </select>
        <button class="btn primary sm" type="submit">Agregar miembro</button>
      </form>
    {:else}
      <p class="hint">No hay más usuarios para agregar.</p>
    {/if}
    {#if form?.memberError}<span class="err" role="alert">{form.memberError}</span>{/if}
  </div>

  <div class="danger-zone">
    <h2>Borrar</h2>
    <form method="POST" action="?/delete" use:enhance bind:this={deleteFormEl}>
      <button class="btn danger" type="button" onclick={() => (showDeleteConfirm = true)}>
        Borrar farmacia
      </button>
    </form>
    <p class="dz-hint">
      Permanente. Sus empleados no se borran: quedan sin asignar y puedes moverlos a otra farmacia.
    </p>
  </div>
</div>

<ConfirmDialog
  open={showDeleteConfirm}
  title="Borrar farmacia"
  message={`¿Borrar "${farmacia.nombre}"? Es permanente. Sus empleados no se borran: quedan sin asignar.`}
  onConfirm={() => {
    showDeleteConfirm = false;
    deleteFormEl.requestSubmit();
  }}
  onCancel={() => (showDeleteConfirm = false)}
/>

<style>
  .wrap {
    max-width: 560px;
    display: flex;
    flex-direction: column;
  }
  .back {
    display: inline-block;
    color: #2563eb;
    text-decoration: none;
    font-size: 0.85rem;
    margin-bottom: 1rem;
  }
  .back:hover {
    text-decoration: underline;
  }
  h1 {
    font-size: 1.5rem;
    font-weight: 700;
    color: #1e293b;
    margin: 0 0 1.5rem;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    margin-bottom: 1.1rem;
  }
  label {
    font-size: 0.82rem;
    font-weight: 600;
    color: #1e293b;
  }
  input[type='text'] {
    font: inherit;
    font-size: 1rem;
    color: #1e293b;
    background: #ffffff;
    border: 1px solid rgba(0, 0, 0, 0.18);
    border-radius: 10px;
    padding: 0.6rem 0.75rem;
    width: 100%;
    box-sizing: border-box;
  }
  input[type='text']:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
  }
  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.6rem;
    margin-top: 1.2rem;
  }
  .btn {
    font: inherit;
    font-weight: 600;
    padding: 0.6rem 1.1rem;
    border-radius: 10px;
    border: 1px solid transparent;
    cursor: pointer;
    text-decoration: none;
  }
  .btn.primary {
    background: #2563eb;
    color: #ffffff;
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
  .btn.sm {
    padding: 0.4rem 0.8rem;
    font-size: 0.82rem;
  }
  .members {
    margin-top: 2rem;
    padding-top: 1.3rem;
    border-top: 1px solid rgba(0, 0, 0, 0.08);
  }
  .members h2 {
    font-size: 0.95rem;
    font-weight: 700;
    color: #1e293b;
    margin: 0 0 0.3rem;
  }
  .members .hint {
    display: block;
    color: rgba(30, 41, 59, 0.55);
    font-size: 0.85rem;
    margin: 0 0 0.9rem;
  }
  .empty-note {
    color: rgba(30, 41, 59, 0.55);
    font-size: 0.9rem;
    margin: 0 0 0.9rem;
  }
  .member-list {
    list-style: none;
    margin: 0 0 1rem;
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
  .ubic-barra {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    flex-wrap: wrap;
    margin-top: 0.7rem;
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
  .btn.primary:disabled {
    background: rgba(30, 41, 59, 0.18);
    box-shadow: none;
    cursor: default;
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
  .danger-zone {
    margin-top: 2rem;
    padding-top: 1.3rem;
    border-top: 1px solid rgba(0, 0, 0, 0.08);
  }
  .danger-zone h2 {
    font-size: 0.95rem;
    font-weight: 700;
    color: #b91c1c;
    margin: 0 0 0.8rem;
  }
  .dz-hint {
    color: rgba(30, 41, 59, 0.55);
    font-size: 0.85rem;
    margin: 0.7rem 0 0;
  }
  .err {
    display: block;
    margin-top: 0.4rem;
    font-size: 0.78rem;
    color: #dc2626;
  }
  .ok {
    display: block;
    margin-top: 0.4rem;
    font-size: 0.78rem;
    color: #15803d;
  }
  .members .hint a {
    color: #2563eb;
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
</style>
