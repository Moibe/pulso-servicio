import type { LayoutServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

// Guard de auth para toda la app: todo requiere estar logueado excepto /login.
export const load: LayoutServerLoad = async ({ locals, url }) => {
	if (!locals.user && url.pathname !== '/login') {
		throw redirect(303, '/login');
	}
	return { user: locals.user };
};
