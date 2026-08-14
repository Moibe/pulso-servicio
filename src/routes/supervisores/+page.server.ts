import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { and, asc, eq, inArray, notInArray } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { supervisores, farmacias } from '$lib/server/db/schema';

// Catálogo de supervisores. Son PERSONAL, no cuentas con login (esas viven en
// /users). Solo admin: hoy toda la gestión de personal está centralizada ahí.
export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user?.isAdmin) throw redirect(303, '/');

	const listaSupervisores = db
		.select({ id: supervisores.id, nombre: supervisores.nombre, creadoEn: supervisores.creadoEn })
		.from(supervisores)
		.orderBy(asc(supervisores.nombre))
		.all();

	// Todas las farmacias con su supervisor actual (o null). Sirve para mostrar
	// qué farmacias tiene cada supervisor Y para armar el checklist de asignar
	// (donde también hace falta saber si una farmacia YA es de alguien más).
	const todasFarmacias = db
		.select({ id: farmacias.id, nombre: farmacias.nombre, supervisorId: farmacias.supervisorId })
		.from(farmacias)
		.orderBy(asc(farmacias.nombre))
		.all();

	const nombrePorSupervisor = new Map(listaSupervisores.map((s) => [s.id, s.nombre]));

	return {
		supervisores: listaSupervisores.map((s) => {
			const propias = todasFarmacias.filter((f) => f.supervisorId === s.id);
			return { ...s, numFarmacias: propias.length, farmacias: propias.map((f) => f.nombre) };
		}),
		farmacias: todasFarmacias.map((f) => ({
			id: f.id,
			nombre: f.nombre,
			supervisorId: f.supervisorId,
			supervisorNombre: f.supervisorId ? (nombrePorSupervisor.get(f.supervisorId) ?? null) : null
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
	},

	// Reemplaza el set de farmacias que supervisa este supervisor por el marcado
	// en el checklist. Una farmacia solo tiene UN supervisor (farmacias.supervisor_id
	// es una sola columna), así que marcar una que ya era de otro se la quita a
	// ese otro (el modal se lo advierte al admin antes de enviar).
	asignarFarmacias: async ({ request, locals }) => {
		if (!locals.user?.isAdmin) throw redirect(303, '/');
		const fd = await request.formData();
		const supervisorId = Number(fd.get('supervisorId'));
		if (!Number.isInteger(supervisorId)) return fail(400, { error: 'Supervisor inválido.' });
		const existe = db.select({ id: supervisores.id }).from(supervisores).where(eq(supervisores.id, supervisorId)).get();
		if (!existe) return fail(400, { error: 'Ese supervisor ya no existe.' });

		const farmaciaIds = fd
			.getAll('farmaciaId')
			.map((v) => Number(v))
			.filter((n) => Number.isInteger(n) && n > 0);

		db.transaction((tx) => {
			if (farmaciaIds.length > 0) {
				tx.update(farmacias).set({ supervisorId }).where(inArray(farmacias.id, farmaciaIds)).run();
				tx.update(farmacias)
					.set({ supervisorId: null })
					.where(and(eq(farmacias.supervisorId, supervisorId), notInArray(farmacias.id, farmaciaIds)))
					.run();
			} else {
				// Ninguna marcada: le quita todas las que tuviera.
				tx.update(farmacias).set({ supervisorId: null }).where(eq(farmacias.supervisorId, supervisorId)).run();
			}
		});

		return { asignado: true };
	}
};
