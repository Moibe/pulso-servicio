import { fail } from '@sveltejs/kit';
import { and, eq, desc } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { menus } from '$lib/server/db/schema';
import { resolveNegocio } from '$lib/server/negocio-context';
import { canManageNegocio, requireManageNegocio, canSeeNegocio } from '$lib/server/access';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const negocio = resolveNegocio(params.id, locals.user);

	const lista = db
		.select()
		.from(menus)
		.where(eq(menus.negocioId, negocio.id))
		.orderBy(desc(menus.creadoEn))
		.all();

	return { negocio, menus: lista, canManage: canManageNegocio(locals.user, negocio.id) };
};

export const actions: Actions = {
	agregarMenu: async ({ request, params, locals }) => {
		const id = Number(params.id);
		if (!Number.isInteger(id) || !canSeeNegocio(locals.user, id)) {
			return fail(404, { error: 'Negocio no encontrado' });
		}
		requireManageNegocio(locals.user, id);

		const data = await request.formData();
		const nombre = String(data.get('nombre') ?? '').trim();
		if (!nombre) return fail(400, { error: 'El nombre del menú no puede estar vacío.' });

		db.insert(menus).values({ negocioId: id, nombre }).run();
		return { success: true };
	},

	renombrarMenu: async ({ request, params, locals }) => {
		const id = Number(params.id);
		if (!Number.isInteger(id) || !canSeeNegocio(locals.user, id)) {
			return fail(404, { error: 'Negocio no encontrado' });
		}
		requireManageNegocio(locals.user, id);

		const data = await request.formData();
		const menuId = Number(data.get('menuId'));
		const nombre = String(data.get('nombre') ?? '').trim();
		if (!Number.isInteger(menuId)) return fail(400, { error: 'Menú inválido' });
		if (!nombre) return fail(400, { error: 'El nombre del menú no puede estar vacío.' });

		// El menú debe pertenecer a este negocio.
		const menu = db
			.select()
			.from(menus)
			.where(and(eq(menus.id, menuId), eq(menus.negocioId, id)))
			.get();
		if (!menu) return fail(404, { error: 'Menú no encontrado' });

		db.update(menus).set({ nombre }).where(eq(menus.id, menuId)).run();
		return { success: true };
	}
};
