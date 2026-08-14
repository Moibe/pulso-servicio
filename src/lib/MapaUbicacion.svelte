<script lang="ts">
  // Mapa de la ubicación de una farmacia. Sirve para las dos cosas:
  //   - editable={false}: solo enseña el pin (ficha de la farmacia).
  //   - editable={true}:  se hace clic en el mapa (o se arrastra el pin) para
  //     elegir la ubicación; avisa al padre por onPick.
  //
  // Leaflet + tiles de OpenStreetMap: no necesita API key ni cuenta de pago,
  // que es lo que nos permite tenerlo self-hosted sin depender de nadie.
  // Leaflet toca `window` al importarse, así que la carga es dinámica dentro de
  // onMount (si no, revienta en el render del servidor).
  import { onMount } from 'svelte';
  import 'leaflet/dist/leaflet.css';
  import type { Map as LeafletMap, Marker } from 'leaflet';

  let {
    lat = null,
    lng = null,
    editable = false,
    zoom = 16,
    onPick
  }: {
    lat?: number | null;
    lng?: number | null;
    editable?: boolean;
    zoom?: number;
    onPick?: (pos: { lat: number; lng: number }) => void;
  } = $props();

  // Vista por defecto cuando la farmacia todavía no tiene ubicación: México
  // entero, para que se pueda bajar a la ciudad que sea.
  const CENTRO_MX: [number, number] = [23.6345, -102.5528];
  const ZOOM_PAIS = 4;

  let contenedor: HTMLDivElement;
  let mapa: LeafletMap | null = $state(null);
  let marcador: Marker | null = null;
  let leaflet: typeof import('leaflet') | null = null;

  // Pin dibujado a mano (divIcon) en vez del icono por defecto de Leaflet: el
  // suyo se sirve como .png con rutas relativas que el bundler no resuelve, y
  // así además va con el azul del sitio.
  function icono(L: typeof import('leaflet')) {
    return L.divIcon({
      className: 'pin-farmacia',
      html: `<svg width="30" height="30" viewBox="0 0 24 24" fill="#2563eb" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.6" fill="#fff" stroke="none"/></svg>`,
      iconSize: [30, 30],
      iconAnchor: [15, 28]
    });
  }

  function ponerMarcador(L: typeof import('leaflet'), m: LeafletMap, la: number, ln: number) {
    if (marcador) {
      marcador.setLatLng([la, ln]);
      return;
    }
    marcador = L.marker([la, ln], { icon: icono(L), draggable: editable }).addTo(m);
    if (editable) {
      marcador.on('dragend', () => {
        const p = marcador!.getLatLng();
        onPick?.({ lat: p.lat, lng: p.lng });
      });
    }
  }

  onMount(() => {
    let vivo = true;

    (async () => {
      const L = (await import('leaflet')).default;
      if (!vivo) return;
      leaflet = L;

      const m = L.map(contenedor, {
        // Sin zoom con la rueda: en la ficha el mapa está embebido y secuestrar
        // el scroll de la página al pasar por encima es molesto.
        scrollWheelZoom: false,
        attributionControl: true
      });
      m.setView(lat != null && lng != null ? [lat, lng] : CENTRO_MX, lat != null && lng != null ? zoom : ZOOM_PAIS);

      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }).addTo(m);

      if (lat != null && lng != null) ponerMarcador(L, m, lat, lng);

      if (editable) {
        m.on('click', (e: import('leaflet').LeafletMouseEvent) => {
          ponerMarcador(L, m, e.latlng.lat, e.latlng.lng);
          onPick?.({ lat: e.latlng.lat, lng: e.latlng.lng });
        });
      }

      mapa = m;
    })();

    return () => {
      vivo = false;
      mapa?.remove();
      mapa = null;
      marcador = null;
    };
  });

  // El padre manda: si cambia (o se borra) la ubicación desde fuera, el mapa se
  // pone al día. Ojo: no reencuadra en cada arrastre del propio pin porque
  // setLatLng no mueve la vista.
  $effect(() => {
    const m = mapa;
    const L = leaflet;
    if (!m || !L) return;

    if (lat == null || lng == null) {
      if (marcador) {
        marcador.remove();
        marcador = null;
      }
      return;
    }
    ponerMarcador(L, m, lat, lng);
  });
</script>

<div class="mapa" class:editable bind:this={contenedor}></div>

<style>
  .mapa {
    width: 100%;
    height: 260px;
    border-radius: 12px;
    border: 1px solid rgba(0, 0, 0, 0.12);
    background: rgba(255, 255, 255, 0.5);
    z-index: 0;
  }
  .mapa.editable {
    cursor: crosshair;
  }
  /* El divIcon trae fondo/borde propios de Leaflet; los quitamos para que se
     vea solo el SVG del pin. */
  :global(.pin-farmacia) {
    background: transparent;
    border: none;
  }
  /* Leaflet pinta sus controles muy arriba (z-index 400-1000) y taparían los
     modales del sitio, que van en z-index 50. */
  :global(.mapa .leaflet-pane),
  :global(.mapa .leaflet-control),
  :global(.mapa .leaflet-top),
  :global(.mapa .leaflet-bottom) {
    z-index: 1;
  }
</style>
