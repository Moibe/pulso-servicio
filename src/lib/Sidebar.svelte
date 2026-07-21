<script lang="ts">
  // Barra lateral "de vidrio" con el mismo tilt 3D que la superior. Incluye el handle
  // para replegar/mostrar. Publica su ancho real a la variable CSS --sidebar-width
  // para que el panel de contenido se ajuste solo. Items de ejemplo: reemplázalos.
  import { page } from '$app/state';

  let {
    collapsed = false,
    toggleCollapsed,
    isAdmin = false
  }: {
    collapsed?: boolean;
    toggleCollapsed: () => void;
    isAdmin?: boolean;
  } = $props();

  // Edita estos items por las secciones reales de tu app.
  // level = profundidad jerárquica (cada uno es subconjunto del anterior: Negocios > Menus > Productos),
  // se usa para indentar el ítem y comunicar visualmente el anidamiento.
  const items = [
    { href: '/', label: 'Negocios', level: 0 },
    { href: '/menus', label: 'Menus', level: 1 },
    { href: '/productos', label: 'Productos', level: 2 }
  ];

  // El resaltado sigue el TIPO de contenido mostrado, no el prefijo de la URL:
  // /negocios/[id] muestra menús → resalta "Menus"; /menus/[id] muestra productos → resalta "Productos".
  function isActive(href: string) {
    const path = page.url.pathname;
    if (href === '/') return path === '/';
    if (href === '/menus') return path === '/menus' || path.startsWith('/negocios/');
    if (href === '/productos') return path === '/productos' || path.startsWith('/menus/');
    return path === href;
  }

  let tiltX = $state(0);
  let tiltY = $state(0);
  let sidebarWidth = $state(240);

  $effect(() => {
    if (typeof document !== 'undefined' && !collapsed) {
      document.documentElement.style.setProperty('--sidebar-width', `${sidebarWidth}px`);
    }
  });

  function handleMove(e: MouseEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    const MAX = 1.2;
    tiltX = -ny * MAX;
    tiltY = nx * MAX;
  }
  function handleLeave() {
    tiltX = 0;
    tiltY = 0;
  }
  function handleCollapseClick(e: MouseEvent) {
    e.stopPropagation();
    tiltX = 0;
    tiltY = 0;
    toggleCollapsed();
  }

  // En móvil la sidebar es un overlay: al elegir una sección, se cierra sola.
  // En desktop no debe cerrarse (ahí siempre está expandida junto al contenido).
  function closeIfMobile() {
    if (window.matchMedia('(max-width: 768px)').matches) toggleCollapsed();
  }
</script>

{#if !collapsed}
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <button type="button" class="scrim" onclick={toggleCollapsed} aria-label="Cerrar barra"></button>
  <aside
    class="sidebar"
    style="transform: perspective(900px) rotateX({tiltX}deg) rotateY({tiltY}deg);"
    bind:clientWidth={sidebarWidth}
    onmousemove={handleMove}
    onmouseleave={handleLeave}
  >
    <nav>
      {#each items as it (it.href)}
        <a
          href={it.href}
          class="nav-item"
          style="margin-left: calc({it.level} * 0.9rem)"
          aria-current={isActive(it.href) ? 'page' : undefined}
          onclick={closeIfMobile}
        >
          {#if it.level > 0}
            <span class="nav-branch" aria-hidden="true"></span>
          {/if}
          <span class="nav-ico" class:nav-ico-sub={it.level > 0} aria-hidden="true"></span>
          <span>{it.label}</span>
        </a>
      {/each}
    </nav>

    {#if isAdmin}
      <a
        href="/users"
        class="admin-link"
        aria-current={page.url.pathname.startsWith('/users') ? 'page' : undefined}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
        Usuarios
      </a>
    {/if}

    <div class="sidebar-footer">
      <button type="button" class="collapse-btn" onclick={handleCollapseClick} aria-label="Replegar barra">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6" /></svg>
      </button>
    </div>
  </aside>
{:else}
  <button type="button" class="reveal-handle" onclick={toggleCollapsed} aria-label="Mostrar barra">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6" /></svg>
  </button>
{/if}

<style>
  .sidebar {
    position: fixed;
    top: calc(2rem + var(--topnav-height, 64px) + env(safe-area-inset-top, 0px));
    left: calc(1rem + env(safe-area-inset-left, 0px));
    bottom: calc(1rem + env(safe-area-inset-bottom, 0px));
    box-sizing: border-box;
    width: max-content;
    min-width: 240px;
    max-width: 380px;
    padding: 1.5rem 1rem;
    display: flex;
    flex-direction: column;
    background: rgba(255, 255, 255, 0.45);
    backdrop-filter: blur(8px) saturate(110%);
    -webkit-backdrop-filter: blur(8px) saturate(110%);
    border: 1px solid rgba(255, 255, 255, 0.7);
    border-radius: 16px;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.6),
      0 4px 16px rgba(0, 0, 0, 0.1);
    transition: transform 0.18s ease-out;
    will-change: transform;
    user-select: none;
  }
  nav {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
  }
  nav::-webkit-scrollbar {
    display: none;
  }
  .nav-item {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.7rem 0.95rem;
    color: rgba(30, 41, 59, 0.88);
    text-decoration: none;
    font-size: 0.95rem;
    letter-spacing: 0.01em;
    border-radius: 8px;
    border: 1px solid transparent;
    transition: background 0.18s ease, border-color 0.18s ease;
  }
  /* Conector tipo árbol de archivos: comunica que el ítem es subconjunto del anterior. */
  .nav-branch {
    width: 10px;
    align-self: stretch;
    flex-shrink: 0;
    border-left: 1.5px solid rgba(30, 41, 59, 0.2);
    border-bottom: 1.5px solid rgba(30, 41, 59, 0.2);
    border-bottom-left-radius: 6px;
    margin-right: 0.1rem;
  }
  .nav-item[aria-current='page'] .nav-branch {
    border-color: rgba(37, 99, 235, 0.4);
  }
  .nav-ico {
    width: 16px;
    height: 16px;
    border-radius: 5px;
    flex-shrink: 0;
    background: rgba(37, 99, 235, 0.45);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.3);
  }
  .nav-ico-sub {
    width: 12px;
    height: 12px;
  }
  .nav-item:hover {
    background: rgba(0, 0, 0, 0.06);
    border-color: rgba(0, 0, 0, 0.1);
  }
  .nav-item[aria-current='page'] {
    color: #1e3a8a;
    background: rgba(37, 99, 235, 0.12);
    border-color: rgba(37, 99, 235, 0.35);
    box-shadow: 0 0 0 1px rgba(37, 99, 235, 0.12) inset;
  }
  .nav-item[aria-current='page'] .nav-ico {
    background: #2563eb;
  }
  .admin-link {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    margin-top: 1rem;
    padding: 0.7rem 0.95rem;
    padding-top: 1rem;
    color: #15803d;
    text-decoration: none;
    font-size: 0.9rem;
    font-weight: 600;
    border-radius: 8px;
    border: 1px solid transparent;
    border-top: 1px solid rgba(0, 0, 0, 0.08);
    transition: background 0.18s ease, border-color 0.18s ease;
  }
  .admin-link:hover {
    background: rgba(22, 163, 74, 0.08);
  }
  .admin-link[aria-current='page'] {
    color: #15803d;
    background: rgba(22, 163, 74, 0.12);
    border-color: rgba(22, 163, 74, 0.3);
  }
  .sidebar-footer {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: auto;
    padding-top: 1rem;
    border-top: 1px solid rgba(0, 0, 0, 0.08);
  }
  .collapse-btn,
  .reveal-handle {
    background: rgba(0, 0, 0, 0.03);
    border: 1px solid rgba(0, 0, 0, 0.12);
    border-radius: 8px;
    padding: 0.4rem 0.5rem;
    color: rgba(30, 41, 59, 0.85);
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font: inherit;
    transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease;
  }
  .collapse-btn:hover,
  .reveal-handle:hover {
    background: rgba(0, 0, 0, 0.07);
    border-color: rgba(0, 0, 0, 0.2);
    color: #0f172a;
  }
  .reveal-handle {
    position: fixed;
    left: calc(0.75rem + env(safe-area-inset-left, 0px));
    top: 50%;
    transform: translateY(-50%);
    padding: 0.55rem 0.45rem;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.7);
    background: rgba(255, 255, 255, 0.45);
    backdrop-filter: blur(8px) saturate(110%);
    -webkit-backdrop-filter: blur(8px) saturate(110%);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.6),
      0 4px 16px rgba(0, 0, 0, 0.1);
    z-index: 10;
  }

  /* Scrim: solo en móvil, para cerrar la sidebar tocando fuera. */
  .scrim {
    display: none;
  }

  /* En móvil la sidebar flota como overlay (drawer) en vez de empujar el contenido. */
  @media (max-width: 768px) {
    .scrim {
      display: block;
      position: fixed;
      inset: 0;
      border: 0;
      margin: 0;
      padding: 0;
      background: rgba(15, 23, 42, 0.35);
      -webkit-backdrop-filter: blur(1px);
      backdrop-filter: blur(1px);
      z-index: 19;
      -webkit-tap-highlight-color: transparent;
    }
    .sidebar {
      z-index: 20;
      width: min(82vw, 300px);
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.6),
        0 8px 32px rgba(0, 0, 0, 0.28);
    }
    .nav-item {
      min-height: 44px;
    }
  }
</style>
