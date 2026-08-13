<script lang="ts">
  // ALTERNATIVA DE MARCA — hoy NO se usa (a propósito, no es código muerto).
  //
  // Corazón con línea de latido: juego literal con el nombre "Pulso". Se comparó
  // contra el bastón de Asclepio ($lib/BrandIconAsclepio.svelte) y se eligió el
  // Asclepio por ser app de uso interno: su doble lectura (serpiente + onda de
  // electro) envejece mejor. Este queda en reserva por si algún día conviene un
  // ícono más obvio al primer vistazo.
  //
  // Para volver a él: cambiar el import y el uso en $lib/TopNav.svelte y en
  // src/routes/login/+page.svelte (es intercambiable, misma prop `size`).
  //
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
