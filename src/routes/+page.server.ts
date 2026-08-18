import { fail } from '@sveltejs/kit';
import { eq, inArray, desc } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { farmacias, farmaciaMembers } from '$lib/server/db/schema';
import { memberFarmaciaIds, ownerFarmaciaIds, requireManageFarmacia } from '$lib/server/access';
import type { Actions, PageServerLoad } from './$types';

// Home: farmacias que el usuario en sesión puede ver (admins: todas; usuarios
// normales: solo las que tengan asignadas como miembro), con si puede administrarla.
export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user!;
	let scope;
	if (!user.isAdmin) {
		const ids = memberFarmaciaIds(user.id);
		if (ids.length === 0) return { farmacias: [] };
		scope = inArray(farmacias.id, ids);
	}
	const lista = db
		.select()
		.from(farmacias)
		.where(scope)
		.orderBy(desc(farmacias.creadoEn))
		.all();

	const ownedIds = user.isAdmin ? null : new Set(ownerFarmaciaIds(user.id));
	return {
		farmacias: lista.map((n) => ({ ...n, canManage: user.isAdmin || ownedIds!.has(n.id) }))
	};
};

export const actions: Actions = {
	// Crear farmacia: cualquier usuario con sesión. Quien la crea nace "owner" de
	// ESA farmacia (la administra por completo aunque no sea admin global).
	crear: async ({ request, locals }) => {
		const user = locals.user!;
		const data = await request.formData();
		const nombre = String(data.get('nombre') ?? '').trim();
		if (!nombre) {
			return fail(400, { error: 'El nombre de la farmacia no puede estar vacío.' });
		}
		const farmacia = db.insert(farmacias).values({ nombre }).returning().get();
		db.insert(farmaciaMembers).values({ farmaciaId: farmacia.id, usuarioId: user.id, rol: 'owner' }).run();
		return { success: true };
	},

	// Renombrar: admin global, u owner de esa farmacia en particular.
	renombrarFarmacia: async ({ request, locals }) => {
		const data = await request.formData();
		const farmaciaId = Number(data.get('farmaciaId'));
		const nombre = String(data.get('nombre') ?? '').trim();
		if (!Number.isInteger(farmaciaId)) return fail(400, { error: 'Farmacia inválida' });
		if (!nombre) return fail(400, { error: 'El nombre de la farmacia no puede estar vacío.' });
		requireManageFarmacia(locals.user, farmaciaId);

		db.update(farmacias).set({ nombre }).where(eq(farmacias.id, farmaciaId)).run();
		return { success: true };
	},

	// Igual que el borrado de /farmacias/[id] (mismo permiso, mismo
	// efecto), pero desde la tarjeta: no hace falta redirect porque ya estás
	// en el home. Sus empleados no se borran: quedan sin asignar (ON DELETE SET NULL).
	borrarFarmacia: async ({ request, locals }) => {
		const farmaciaId = Number((await request.formData()).get('farmaciaId'));
		if (!Number.isInteger(farmaciaId)) return fail(400, { error: 'Farmacia inválida' });
		requireManageFarmacia(locals.user, farmaciaId);

		db.delete(farmacias).where(eq(farmacias.id, farmaciaId)).run();
		return { success: true };
	}
};
