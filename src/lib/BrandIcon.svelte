<script lang="ts">
  // Marca de Pulso Servicio: un caduceo (bastón de Hermes con alas y dos
  // serpientes entrelazadas). Trazo tipo lucide, hereda el color con currentColor.
  let { size = 24 }: { size?: number } = $props();
</script>

<svg
  class="brand-icon"
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="1.6"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  <!-- pomo + bastón central -->
  <circle cx="12" cy="3.4" r="1.15" />
  <path d="M12 4.6v16.7" />
  <!-- alas -->
  <path d="M12 6.9c-2-1.3-4.2-1.6-6.4-.9" />
  <path d="M12 6.9c2-1.3 4.2-1.6 6.4-.9" />
  <!-- dos serpientes que cruzan el bastón -->
  <path d="M12 20.7c3.3-1.1 3.3-3.9 0-5 3.3-1.1 3.3-3.9 0-5" />
  <path d="M12 20.7c-3.3-1.1-3.3-3.9 0-5-3.3-1.1-3.3-3.9 0-5" />
  <!-- cabezas -->
  <path d="M12 10.7c.7-.5 1.7-.5 2.4.1" />
  <path d="M12 10.7c-.7-.5-1.7-.5-2.4.1" />
</svg>

<style>
  .brand-icon {
    display: block;
    flex-shrink: 0;
  }
</style>
