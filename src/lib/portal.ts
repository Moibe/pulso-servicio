/**
 * Mueve el nodo a <body> al montarse, y lo saca al desmontarse.
 *
 * Hace falta para los overlays de los modales. `main` es `position: fixed`, y
 * eso por sí solo crea un contexto de apilamiento: cualquier z-index de sus
 * descendientes queda encerrado ahí, así que el `z-index: 50` del overlay no
 * podía competir con la TopNav (z-index 9) ni con la sidebar (20) y el botón
 * "Salir" seguía siendo tappable por encima de un diálogo abierto. Subiendo el
 * nodo a <body> el overlay vuelve al contexto raíz y su z-index sí gana.
 *
 * Las clases con hash de Svelte viajan en el atributo del elemento, así que los
 * estilos scoped siguen aplicando después de moverlo.
 */
export function portal(node: HTMLElement) {
  document.body.appendChild(node);
  return {
    destroy() {
      node.remove();
    }
  };
}
