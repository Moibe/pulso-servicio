import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// La página de ajustes se fusionó con la ficha de la farmacia: todo lo que vivía
// aquí (nombre, ubicación, miembros, borrar) se edita ahora en /farmacias/[id].
// La ruta se queda solo para redirigir y no romper enlaces o marcadores viejos.
export const load: PageServerLoad = async ({ params }) => {
	throw redirect(308, `/farmacias/${params.id}`);
};
