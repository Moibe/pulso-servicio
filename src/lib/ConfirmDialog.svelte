<script lang="ts">
  // Modal de confirmación reutilizable para acciones destructivas (borrar).
  // Sustituye a window.confirm(): mismo look and feel que el resto del sitio en
  // vez de la alerta genérica del navegador. El padre controla `open` por
  // completo (no es bindable): al cancelar/Escape/click-fuera se llama a
  // onCancel(), que es quien realmente cierra (poniendo su propio estado en null).
  let {
    open,
    title,
    message,
    confirmLabel = 'Borrar',
    cancelLabel = 'Cancelar',
    onConfirm,
    onCancel
  }: {
    open: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
  } = $props();
</script>

<svelte:window
  onkeydown={(e) => {
    if (e.key === 'Escape' && open) onCancel();
  }}
/>

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div class="overlay" onclick={onCancel}>
    <div
      class="modal"
      role="alertdialog"
      tabindex="-1"
      aria-modal="true"
      aria-label={title}
      onclick={(e) => e.stopPropagation()}
    >
      <h2>{title}</h2>
      <p class="msg">{message}</p>
      <div class="acciones">
        <button type="button" class="btn ghost" onclick={onCancel}>{cancelLabel}</button>
        <button type="button" class="btn danger" onclick={onConfirm}>{confirmLabel}</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.45);
    backdrop-filter: blur(2px);
    -webkit-backdrop-filter: blur(2px);
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
  h2 {
    margin: 0 0 0.75rem;
    font-size: 1.15rem;
    font-weight: 700;
    color: #1e293b;
  }
  .msg {
    margin: 0;
    font-size: 0.92rem;
    line-height: 1.45;
    color: rgba(30, 41, 59, 0.75);
  }
  .acciones {
    display: flex;
    justify-content: flex-end;
    gap: 0.6rem;
    margin-top: 1.4rem;
  }
  .btn {
    font: inherit;
    font-weight: 600;
    padding: 0.55rem 1.1rem;
    border-radius: 10px;
    border: 1px solid transparent;
    cursor: pointer;
  }
  .btn.ghost {
    background: transparent;
    border-color: rgba(0, 0, 0, 0.15);
    color: rgba(30, 41, 59, 0.75);
  }
  .btn.ghost:hover {
    background: rgba(0, 0, 0, 0.05);
  }
  .btn.danger {
    background: #dc2626;
    color: #fff;
    box-shadow: 0 2px 8px rgba(220, 38, 38, 0.35);
    transition: background 0.18s ease, transform 0.12s ease;
  }
  .btn.danger:hover {
    background: #b91c1c;
  }
  .btn.danger:active {
    transform: translateY(1px);
  }
</style>
