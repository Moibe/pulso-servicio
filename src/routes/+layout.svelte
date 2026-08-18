<script lang="ts">
  import type { Snippet } from 'svelte';
  import { browser } from '$app/environment';
  // El favicon es el bastón de Asclepio de $lib/BrandIconAsclepio.svelte, pero
  // adaptado a 16px: fondo sólido (sin él desaparece en pestañas oscuras), trazo
  // más grueso y una vuelta menos de serpiente, que a ese tamaño se emplasta.
  // Ojo: Vite lo embebe como data-URI en cada página, así que el .svg va sin
  // comentarios ni espacios de más — todo lo que tenga dentro viaja.
  import favicon from '$lib/assets/favicon.svg';
  import TopNav from '$lib/TopNav.svelte';
  import Sidebar from '$lib/Sidebar.svelte';
  import type { LayoutData } from './$types';

  let { data, children }: { data: LayoutData; children: Snippet } = $props();
  // En móvil arranca replegada (se abre como overlay); en desktop, expandida.
  let collapsed = $state(browser && window.matchMedia('(max-width: 768px)').matches);

  // View Transitions cuando el browser las soporta para animar el repliegue.
  function withTransition(fn: () => void) {
    if (typeof document !== 'undefined' && 'startViewTransition' in document) {
      (document as unknown as { startViewTransition: (cb: () => void) => void }).startViewTransition(fn);
    } else {
      fn();
    }
  }
  function toggleCollapsed() {
    withTransition(() => {
      collapsed = !collapsed;
    });
  }
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

{#if data.user}
  <TopNav user={data.user} />
  <Sidebar {collapsed} {toggleCollapsed} isAdmin={data.user.isAdmin} />
  <main class={collapsed ? 'collapsed' : ''}>
    <div class="work-scroll">
      {@render children()}
    </div>
  </main>
{:else}
  {@render children()}
{/if}

<style>
  :global(:root) {
    --topnav-height: 64px;
  }

  :global(html, body) {
    margin: 0;
    padding: 0;
    height: 100%;
  }
  :global(body) {
    min-height: 100vh;
    min-height: 100dvh;
    background: linear-gradient(135deg, #fffdf7 0%, #e7e0d0 100%);
    background-attachment: fixed;
    color: rgba(30, 41, 59, 0.95);
    font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  }

  :global(*) {
    scrollbar-width: auto;
    scrollbar-color: rgba(30, 41, 59, 0.4) rgba(0, 0, 0, 0.08);
    -webkit-tap-highlight-color: transparent;
  }
  :global(::-webkit-scrollbar) {
    width: 14px;
    height: 14px;
  }
  :global(::-webkit-scrollbar-track) {
    background: rgba(0, 0, 0, 0.05);
    border-radius: 999px;
  }
  :global(::-webkit-scrollbar-thumb) {
    background: rgba(30, 41, 59, 0.4);
    border-radius: 999px;
    border: 3px solid transparent;
    background-clip: padding-box;
  }
  :global(::-webkit-scrollbar-thumb:hover) {
    background: rgba(30, 41, 59, 0.6);
    background-clip: padding-box;
  }

  main {
    position: fixed;
    top: calc(2rem + var(--topnav-height) + env(safe-area-inset-top, 0px));
    right: calc(1rem + env(safe-area-inset-right, 0px));
    bottom: calc(1rem + env(safe-area-inset-bottom, 0px));
    box-sizing: border-box;
    background: rgba(255, 255, 255, 0.45);
    border: 1px solid rgba(255, 255, 255, 0.7);
    border-radius: 16px;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.6),
      0 4px 16px rgba(0, 0, 0, 0.1);
    overflow: hidden;
    transition: left 0.22s ease-out;
    left: calc(var(--sidebar-width, 240px) + 2rem + env(safe-area-inset-left, 0px));
  }
  main.collapsed {
    left: calc(2rem + env(safe-area-inset-left, 0px));
  }
  /* El vidrio va en un pseudo-elemento, NO en main.
     backdrop-filter convierte al elemento en bloque contenedor de sus
     descendientes position:fixed. Estando en main, los overlays de los modales
     (position: fixed; inset: 0) se medían contra main y no contra la pantalla:
     quedaban en 394x812 en vez de 428x926, la TopNav se quedaba sin atenuar y
     "Salir" seguía siendo tappable por encima del diálogo abierto. Además su
     z-index: 50 quedaba atrapado en el contexto de apilamiento de main, así que
     el asa del menú (z-index 10, fuera de main) se pintaba encima del diálogo.
     Movido al ::before, main deja de ser bloque contenedor y los modales vuelven
     a cubrir la pantalla. El vidrio se ve igual: el pseudo-elemento pinta sobre
     el fondo translúcido de main, así que el orden de capas no cambia. */
  main::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    -webkit-backdrop-filter: blur(8px) saturate(110%);
    backdrop-filter: blur(8px) saturate(110%);
    pointer-events: none;
  }

  /* En móvil la sidebar pasa a overlay (no empuja): main siempre ocupa todo el ancho.
     El margen izquierdo es de 3.25rem y no de 1rem para dejarle una canaleta al
     asa que abre el menú (.reveal-handle, fija en left: 0.75rem y centrada a
     top: 50%, o sea que con scroll acaba cayendo sobre cualquier control). Antes
     el asa flotaba SOBRE el panel y le robaba los toques: en /users tapaba el
     87% de la casilla "Administrador" y tocarla abría el menú en vez de marcarla,
     así que era imposible crear un admin desde el teléfono. Se aplica a los dos
     estados (con menú abierto y cerrado) para que el panel no brinque al abrirlo. */
  @media (max-width: 768px) {
    main,
    main.collapsed {
      left: calc(3.25rem + env(safe-area-inset-left, 0px));
      transition: none;
    }
  }

  .work-scroll {
    position: absolute;
    top: 16px;
    bottom: 16px;
    left: 0;
    right: 0;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 0 16px;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
  }

  /* --- Reglas compartidas por las páginas de listas (evita duplicar en cada una) --- */

  /* iOS hace auto-zoom al enfocar inputs con font-size < 16px (p.ej. .edit-input a 0.95rem).
     Va con !important a propósito: esto compila a `input`/`select`/`textarea`
     (especificidad 0-0-1) y cualquier regla de página con una clase le gana. Así
     se colaban tres selects por debajo del umbral (`.add-member select` a 15.2px
     en ajustes de farmacia; `.tile-mover select` a 12.8px y `.mover select` a
     14.4px en empleados) y el zoom saltaba justo donde este guardia decía que no.
     Es una barrera, no una preferencia de estilo: tiene que ganar siempre. */
  @media (max-width: 768px) {
    :global(input),
    :global(select),
    :global(textarea) {
      font-size: 16px !important;
    }
  }

  /* Tap targets >= 44px (Apple HIG / WCAG 2.5.5) en punteros táctiles.
     Antes solo cubría .icon-btn y .view-btn, así que los botones de verdad
     quedaban por debajo: .btn-nuevo a 37.2px, .btn.sm a 29.8px ("Quitar",
     "Guardar supervisor"), "Salir" a 30.8px, y la casilla nativa a 12x12 px. */
  @media (pointer: coarse) {
    :global(.icon-btn) {
      min-width: 2.75rem;
      min-height: 2.75rem;
    }
    :global(.view-btn),
    :global(.btn),
    :global(.btn-nuevo),
    :global(.btn-ok),
    :global(.btn-cancelar),
    :global(.logout),
    :global(.reveal-handle) {
      min-height: 2.75rem;
    }
    /* Las casillas nativas salen de 12x12: con el dedo son inacertables. Se
       agranda la casilla y se le da alto de toque a la etiqueta que la envuelve. */
    :global(input[type='checkbox']) {
      width: 1.375rem;
      height: 1.375rem;
    }
    :global(.chk) {
      min-height: 2.75rem;
    }
  }

  /* Header de las listas: apila título/botón en pantallas muy chicas.
     (align-items no se toca aquí: el align-items:center de cada página le gana
     en especificidad a este override global, así que solo cambiamos el eje.) */
  @media (max-width: 480px) {
    :global(.head) {
      flex-direction: column;
    }
    :global(.btn-nuevo) {
      width: 100%;
    }
  }

  /* Trunca nombres largos en vez de desbordar el renglón.
     display:block es indispensable: el nombre va en un <span> y en elementos
     inline no aplican overflow/text-overflow/max-width, así que el texto se
     salía de su caja y se encimaba con lo que sigue en el renglón. */
  :global(.item-nombre) {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
  }
</style>
