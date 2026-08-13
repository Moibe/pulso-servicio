import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { asc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { empleados, farmacias } from '$lib/server/db/schema';

// Catálogo de empleados. Son PERSONAL, no cuentas con login. Cada uno pertenece
// a UNA farmacia a la vez (o a ninguna); moverlo es cambiar esa referencia.
// Solo admin, igual que /supervisores.
export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user?.isAdmin) throw redirect(303, '/');

	// leftJoin: los empleados sin farmacia asignada también deben listarse.
	const lista = db
		.select({
			id: empleados.id,
			nombre: empleados.nombre,
			creadoEn: empleados.creadoEn,
			farmaciaId: empleados.farmaciaId,
			farmaciaNombre: farmacias.nombre
		})
		.from(empleados)
		.leftJoin(farmacias, eq(empleados.farmaciaId, farmacias.id))
		.orderBy(asc(empleados.nombre))
		.all();

	const todasFarmacias = db
		.select({ id: farmacias.id, nombre: farmacias.nombre })
		.from(farmacias)
		.orderBy(asc(farmacias.nombre))
		.all();

	return { empleados: lista, farmacias: todasFarmacias };
};

// '' (opción "sin asignar") → null. Cualquier otra cosa debe ser un id que EXISTA:
// sin comprobarlo, la FK revienta con un 500 crudo en vez de un mensaje decente
// (pasa de verdad si borran la farmacia en otra pestaña con el form ya abierto).
function parseFarmaciaId(raw: FormDataEntryValue | null): number | null | 'invalido' {
	const s = String(raw ?? '').trim();
	if (s === '') return null;
	const n = Number(s);
	if (!Number.isInteger(n) || n <= 0) return 'invalido';
	const existe = db.select({ id: farmacias.id }).from(farmacias).where(eq(farmacias.id, n)).get();
	return existe ? n : 'invalido';
}

export const actions: Actions = {
	crear: async ({ request, locals }) => {
		if (!locals.user?.isAdmin) throw redirect(303, '/');
		const fd = await request.formData();
		const nombre = String(fd.get('nombre') ?? '').trim();
		if (!nombre) return fail(400, { error: 'El nombre del empleado no puede estar vacío.' });

		const farmaciaId = parseFarmaciaId(fd.get('farmaciaId'));
		if (farmaciaId === 'invalido') return fail(400, { error: 'Esa farmacia ya no existe.' });

		db.insert(empleados).values({ nombre, farmaciaId }).run();
		return { success: true };
	},

	renombrar: async ({ request, locals }) => {
		if (!locals.user?.isAdmin) throw redirect(303, '/');
		const fd = await request.formData();
		const id = Number(fd.get('empleadoId'));
		const nombre = String(fd.get('nombre') ?? '').trim();
		if (!Number.isInteger(id)) return fail(400, { error: 'Empleado inválido.' });
		if (!nombre) return fail(400, { error: 'El nombre del empleado no puede estar vacío.' });

		db.update(empleados).set({ nombre }).where(eq(empleados.id, id)).run();
		return { success: true };
	},

	// Mover de farmacia (o dejarlo sin asignar). Como farmaciaId es una sola
	// columna, cambiarla ya garantiza que siga perteneciendo a UNA farmacia.
	mover: async ({ request, locals }) => {
		if (!locals.user?.isAdmin) throw redirect(303, '/');
		const fd = await request.formData();
		const id = Number(fd.get('empleadoId'));
		if (!Number.isInteger(id)) return fail(400, { error: 'Empleado inválido.' });

		const farmaciaId = parseFarmaciaId(fd.get('farmaciaId'));
		if (farmaciaId === 'invalido') return fail(400, { error: 'Esa farmacia ya no existe.' });

		db.update(empleados).set({ farmaciaId }).where(eq(empleados.id, id)).run();
		return { success: true };
	},

	borrar: async ({ request, locals }) => {
		if (!locals.user?.isAdmin) throw redirect(303, '/');
		const id = Number((await request.formData()).get('empleadoId'));
		if (!Number.isInteger(id)) return fail(400, { error: 'Empleado inválido.' });

		db.delete(empleados).where(eq(empleados.id, id)).run();
		return { success: true };
	}
};
