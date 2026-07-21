<script lang="ts">
  // Barra superior "de vidrio" con tilt 3D al pasar el mouse. Marca + área de usuario.
  import Avatar from '$lib/Avatar.svelte';

  let { user }: { user: { username: string } } = $props();

  let tiltX = $state(0);
  let tiltY = $state(0);

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
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<header
  class="topnav"
  style="transform: perspective(900px) rotateX({tiltX}deg) rotateY({tiltY}deg);"
  onmousemove={handleMove}
  onmouseleave={handleLeave}
>
  <a href="/" class="brand" aria-label="Inicio">
    <span class="brand-ico" aria-hidden="true"></span>
    <span class="brand-title">Pulso Servicio</span>
  </a>

  <div class="user-area">
    <a class="who" href="/me" title="Mi usuario">
      <Avatar username={user.username} size={28} />
      <span class="who-name">{user.username}</span>
    </a>
    <form method="POST" action="/logout">
      <button class="logout" type="submit">Salir</button>
    </form>
  </div>
</header>

<style>
  .topnav {
    position: fixed;
    top: calc(1rem + env(safe-area-inset-top, 0px));
    left: calc(1rem + env(safe-area-inset-left, 0px));
    right: calc(1rem + env(safe-area-inset-right, 0px));
    height: var(--topnav-height, 64px);
    padding: 0 1.25rem;
    box-sizing: border-box;
    display: flex;
    align-items: center;
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
    z-index: 9;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    color: rgba(30, 41, 59, 0.98);
    text-decoration: none;
    border-radius: 8px;
    padding: 0.25rem 0.4rem;
    transition: background 0.18s ease;
  }
  .brand:hover {
    background: rgba(0, 0, 0, 0.05);
  }
  .brand-ico {
    width: 22px;
    height: 22px;
    border-radius: 6px;
    flex-shrink: 0;
    background: rgba(30, 41, 59, 0.85);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.3);
  }
  .brand-title {
    font-size: 1.2rem;
    letter-spacing: 0.005em;
    font-weight: 600;
  }

  .user-area {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    margin-left: auto;
  }
  .who {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: rgba(30, 41, 59, 0.9);
    text-decoration: none;
    border-radius: 8px;
    padding: 0.3rem 0.5rem;
    transition: background 0.18s ease;
  }
  .who:hover {
    background: rgba(0, 0, 0, 0.05);
  }
  .who-name {
    font-size: 0.9rem;
    font-weight: 600;
  }
  .logout {
    font: inherit;
    font-size: 0.85rem;
    font-weight: 600;
    color: rgba(30, 41, 59, 0.6);
    background: transparent;
    border: 1px solid rgba(0, 0, 0, 0.12);
    border-radius: 8px;
    padding: 0.4rem 0.75rem;
    cursor: pointer;
    transition: background 0.18s ease, color 0.18s ease, border-color 0.18s ease;
  }
  .logout:hover {
    background: rgba(220, 38, 38, 0.08);
    border-color: rgba(220, 38, 38, 0.35);
    color: #dc2626;
  }

  /* En pantallas chicas: solo ícono (oculta el título) para que no se desborde. */
  @media (max-width: 680px) {
    .topnav {
      padding: 0 0.6rem;
    }
    .brand {
      gap: 0;
      padding: 0.25rem;
    }
    .brand-title {
      display: none;
    }
    .who-name {
      display: none;
    }
    .user-area {
      gap: 0.35rem;
    }
    .logout {
      padding: 0.4rem 0.55rem;
    }
  }
  @media (max-width: 360px) {
    .topnav {
      padding: 0 0.4rem;
    }
  }
</style>
