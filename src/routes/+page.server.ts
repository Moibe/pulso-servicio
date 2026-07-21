import { fail } from '@sveltejs/kit';
import { eq, inArray, desc } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { negocios, negocioMembers } from '$lib/server/db/schema';
import { memberNegocioIds, ownerNegocioIds, requireManageNegocio } from '$lib/server/access';
import type { Actions, PageServerLoad } from './$types';

// Home: negocios que el usuario en sesión puede ver (admins: todos; usuarios
// normales: solo los que tengan asignados como miembro), con si puede administrarlo.
export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user!;
	let scope;
	if (!user.isAdmin) {
		const ids = memberNegocioIds(user.id);
		if (ids.length === 0) return { negocios: [] };
		scope = inArray(negocios.id, ids);
	}
	const lista = db
		.select()
		.from(negocios)
		.where(scope)
		.orderBy(desc(negocios.creadoEn))
		.all();

	const ownedIds = user.isAdmin ? null : new Set(ownerNegocioIds(user.id));
	return {
		negocios: lista.map((n) => ({ ...n, canManage: user.isAdmin || ownedIds!.has(n.id) }))
	};
};

export const actions: Actions = {
	// Crear negocio: cualquier usuario con sesión. Quien lo crea nace "owner" de
	// ESE negocio (lo administra por completo aunque no sea admin global).
	crear: async ({ request, locals }) => {
		const user = locals.user!;
		const data = await request.formData();
		const nombre = String(data.get('nombre') ?? '').trim();
		if (!nombre) {
			return fail(400, { error: 'El nombre del negocio no puede estar vacío.' });
		}
		const negocio = db.insert(negocios).values({ nombre }).returning().get();
		db.insert(negocioMembers).values({ negocioId: negocio.id, usuarioId: user.id, rol: 'owner' }).run();
		return { success: true };
	},

	// Renombrar: admin global, u owner de ese negocio en particular.
	renombrarNegocio: async ({ request, locals }) => {
		const data = await request.formData();
		const negocioId = Number(data.get('negocioId'));
		const nombre = String(data.get('nombre') ?? '').trim();
		if (!Number.isInteger(negocioId)) return fail(400, { error: 'Negocio inválido' });
		if (!nombre) return fail(400, { error: 'El nombre del negocio no puede estar vacío.' });
		requireManageNegocio(locals.user, negocioId);

		db.update(negocios).set({ nombre }).where(eq(negocios.id, negocioId)).run();
		return { success: true };
	}
};
