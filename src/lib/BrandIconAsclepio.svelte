<script lang="ts">
  // Opción B: bastón de Asclepio (UNA serpiente, sin alas) — el símbolo médico
  // técnicamente correcto (el caduceo de Hermes se usa por confusión histórica).
  // Trazo tipo lucide, hereda el color con currentColor.
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
  <!-- bastón -->
  <path d="M12 2.4v19.2" />
  <!-- serpiente enrollada (3 vueltas alternando lado) -->
  <path d="M12 20c5.6-1.2 5.6-3.8 0-5c-5.6-1.2-5.6-3.8 0-5c5.6-1.2 5.6-3.8 0-5" />
  <!-- cabeza -->
  <path d="M12 5c1.15-.75 2.5-.35 3.1.65" />
</svg>

<style>
  .brand-icon {
    display: block;
    flex-shrink: 0;
  }
</style>
