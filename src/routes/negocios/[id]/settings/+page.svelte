<script lang="ts">
  import { enhance } from '$app/forms';
  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();
  const negocio = $derived(data.negocio);
</script>

<div class="wrap">
  <a class="back" href="/negocios/{negocio.id}">← Volver</a>
  <h1>Ajustes de negocio</h1>

  <form method="POST" action="?/rename" use:enhance>
    <div class="field">
      <label for="nombre">Nombre</label>
      <input id="nombre" name="nombre" type="text" value={negocio.nombre} />
      {#if form?.nameError}<span class="err" role="alert">{form.nameError}</span>{/if}
    </div>
    <div class="actions">
      <a class="btn ghost" href="/negocios/{negocio.id}">Cancelar</a>
      <button class="btn primary" type="submit">Guardar</button>
    </div>
  </form>

  <div class="members">
    <h2>Miembros</h2>
    <p class="hint">Quiénes (no-admins) pueden ver este negocio. Los administradores lo ven siempre.</p>

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
    <form method="POST" action="?/delete" use:enhance>
      <button
        class="btn danger"
        type="submit"
        onclick={(e) => {
          if (!confirm(`¿Borrar "${negocio.nombre}"? Se van también sus menús y productos. Es permanente.`))
            e.preventDefault();
        }}
      >
        Borrar negocio
      </button>
    </form>
    <p class="dz-hint">Permanente: se lleva en cascada todos sus menús y productos.</p>
  </div>
</div>

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
</style>
