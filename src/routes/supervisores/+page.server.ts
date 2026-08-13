import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { asc, count, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { supervisores, farmacias } from '$lib/server/db/schema';

// Catálogo de supervisores. Son PERSONAL, no cuentas con login (esas viven en
// /users). Solo admin: hoy toda la gestión de personal está centralizada ahí.
export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user?.isAdmin) throw redirect(303, '/');

	// Un supervisor puede supervisar varias farmacias → se cuentan por leftJoin
	// (leftJoin, no inner: los supervisores sin farmacias también deben salir).
	const lista = db
		.select({
			id: supervisores.id,
			nombre: supervisores.nombre,
			creadoEn: supervisores.creadoEn,
			numFarmacias: count(farmacias.id)
		})
		.from(supervisores)
		.leftJoin(farmacias, eq(farmacias.supervisorId, supervisores.id))
		.groupBy(supervisores.id)
		.orderBy(asc(supervisores.nombre))
		.all();

	// Para mostrar QUÉ farmacias supervisa cada uno.
	const asignaciones = db
		.select({ supervisorId: farmacias.supervisorId, nombre: farmacias.nombre })
		.from(farmacias)
		.orderBy(asc(farmacias.nombre))
		.all();

	return {
		supervisores: lista.map((s) => ({
			...s,
			farmacias: asignaciones.filter((a) => a.supervisorId === s.id).map((a) => a.nombre)
		}))
	};
};

export const actions: Actions = {
	crear: async ({ request, locals }) => {
		if (!locals.user?.isAdmin) throw redirect(303, '/');
		const nombre = String((await request.formData()).get('nombre') ?? '').trim();
		if (!nombre) return fail(400, { error: 'El nombre del supervisor no puede estar vacío.' });

		db.insert(supervisores).values({ nombre }).run();
		return { success: true };
	},

	renombrar: async ({ request, locals }) => {
		if (!locals.user?.isAdmin) throw redirect(303, '/');
		const fd = await request.formData();
		const id = Number(fd.get('supervisorId'));
		const nombre = String(fd.get('nombre') ?? '').trim();
		if (!Number.isInteger(id)) return fail(400, { error: 'Supervisor inválido.' });
		if (!nombre) return fail(400, { error: 'El nombre del supervisor no puede estar vacío.' });

		db.update(supervisores).set({ nombre }).where(eq(supervisores.id, id)).run();
		return { success: true };
	},

	// Borrar un supervisor NO borra sus farmacias: la FK es ON DELETE SET NULL,
	// así que esas farmacias simplemente quedan sin supervisor.
	borrar: async ({ request, locals }) => {
		if (!locals.user?.isAdmin) throw redirect(303, '/');
		const id = Number((await request.formData()).get('supervisorId'));
		if (!Number.isInteger(id)) return fail(400, { error: 'Supervisor inválido.' });

		db.delete(supervisores).where(eq(supervisores.id, id)).run();
		return { success: true };
	}
};
