import { fail } from '@sveltejs/kit';
import { eq, inArray, desc } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { menus, negocios } from '$lib/server/db/schema';
import { memberNegocioIds, ownerNegocioIds, requireManageNegocio } from '$lib/server/access';
import type { Actions, PageServerLoad } from './$types';

// Todos los menús que el usuario puede ver (admins: todos; usuarios normales:
// solo los de sus negocios asignados), con el nombre de su negocio y si lo puede
// administrar (según el negocio al que pertenece).
export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user!;
	let scope;
	if (!user.isAdmin) {
		const ids = memberNegocioIds(user.id);
		if (ids.length === 0) return { menus: [] };
		scope = inArray(menus.negocioId, ids);
	}

	const lista = db
		.select({
			id: menus.id,
			nombre: menus.nombre,
			creadoEn: menus.creadoEn,
			negocioId: menus.negocioId,
			negocioNombre: negocios.nombre
		})
		.from(menus)
		.innerJoin(negocios, eq(menus.negocioId, negocios.id))
		.where(scope)
		.orderBy(desc(menus.creadoEn))
		.all();

	const ownedIds = user.isAdmin ? null : new Set(ownerNegocioIds(user.id));
	return { menus: lista.map((m) => ({ ...m, canManage: user.isAdmin || ownedIds!.has(m.negocioId) })) };
};

export const actions: Actions = {
	renombrarMenu: async ({ request, locals }) => {
		const data = await request.formData();
		const menuId = Number(data.get('menuId'));
		const nombre = String(data.get('nombre') ?? '').trim();
		if (!Number.isInteger(menuId)) return fail(400, { error: 'Menú inválido' });
		if (!nombre) return fail(400, { error: 'El nombre del menú no puede estar vacío.' });

		const row = db.select({ id: menus.id, negocioId: menus.negocioId }).from(menus).where(eq(menus.id, menuId)).get();
		if (!row) return fail(404, { error: 'Menú no encontrado' });
		requireManageNegocio(locals.user, row.negocioId);

		db.update(menus).set({ nombre }).where(eq(menus.id, menuId)).run();
		return { success: true };
	}
};
