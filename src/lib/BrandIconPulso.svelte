<script lang="ts">
  // Opción C: corazón con línea de latido — juego literal con el nombre "Pulso".
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
  <!-- corazón -->
  <path d="M12 20.6C8.3 17.6 4 14.2 4 10.1A4.6 4.6 0 0 1 12 7a4.6 4.6 0 0 1 8 3.1c0 4.1-4.3 7.5-8 10.5z" />
  <!-- línea de latido cruzando el corazón -->
  <path d="M4.4 11.9h3.3l1.4-2.5 2.3 5 1.7-3.2h4.5" />
</svg>

<style>
  .brand-icon {
    display: block;
    flex-shrink: 0;
  }
</style>
