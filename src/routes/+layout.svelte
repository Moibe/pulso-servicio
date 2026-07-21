<script lang="ts">
  import type { Snippet } from 'svelte';
  import { browser } from '$app/environment';
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
    backdrop-filter: blur(8px) saturate(110%);
    -webkit-backdrop-filter: blur(8px) saturate(110%);
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

  /* En móvil la sidebar pasa a overlay (no empuja): main siempre ocupa todo el ancho. */
  @media (max-width: 768px) {
    main,
    main.collapsed {
      left: calc(1rem + env(safe-area-inset-left, 0px));
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

  /* iOS hace auto-zoom al enfocar inputs con font-size < 16px (p.ej. .edit-input a 0.95rem). */
  @media (max-width: 768px) {
    :global(input),
    :global(select),
    :global(textarea) {
      font-size: 16px;
    }
  }

  /* Tap targets >= 44px (Apple HIG / WCAG 2.5.5) en punteros táctiles. */
  @media (pointer: coarse) {
    :global(.icon-btn) {
      min-width: 2.75rem;
      min-height: 2.75rem;
    }
    :global(.view-btn) {
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

  /* Trunca nombre/contexto largos en vez de desbordar el renglón. */
  :global(.item-nombre),
  :global(.item-ctx),
  :global(.tile-ctx) {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
  }
</style>
