import type { Actions, PageServerLoad } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { farmacias, usuarios, farmaciaMembers, supervisores, empleados } from '$lib/server/db/schema';
import { and, asc, eq } from 'drizzle-orm';
import { requireAdmin, requireManageFarmacia } from '$lib/server/access';

// Ajustes de farmacia — admin global, u owner de ESA farmacia. Renombrar, membresía
// (quién más puede verla) y borrar.
export const load: PageServerLoad = async ({ params, locals }) => {
	const id = Number(params.id);
	if (!Number.isInteger(id) || id <= 0) throw error(404, 'Farmacia no encontrada');
	requireManageFarmacia(locals.user, id);

	const farmacia = db.select().from(farmacias).where(eq(farmacias.id, id)).get();
	if (!farmacia) throw error(404, 'Farmacia no encontrada');

	const memberRows = db
		.select({ usuarioId: farmaciaMembers.usuarioId, rol: farmaciaMembers.rol })
		.from(farmaciaMembers)
		.where(eq(farmaciaMembers.farmaciaId, id))
		.all();
	const memberRoles = new Map(memberRows.map((r) => [r.usuarioId, r.rol]));

	const allUsers = db
		.select({ id: usuarios.id, username: usuarios.username, isAdmin: usuarios.isAdmin })
		.from(usuarios)
		.orderBy(asc(usuarios.username))
		.all();

	// Los admins ya ven todo, así que no se ofrecen como miembros.
	const members = allUsers
		.filter((u) => memberRoles.has(u.id))
		.map((u) => ({ ...u, rol: memberRoles.get(u.id) }));
	const candidates = allUsers.filter((u) => !u.isAdmin && !memberRoles.has(u.id));

	// Personal (supervisor y empleados). La gestión del personal es solo del
	// admin, así que un owner no-admin lo ve pero no puede cambiarlo.
	const isAdmin = !!locals.user?.isAdmin;
	const todosSupervisores = db
		.select({ id: supervisores.id, nombre: supervisores.nombre })
		.from(supervisores)
		.orderBy(asc(supervisores.nombre))
		.all();
	const supervisorActual = farmacia.supervisorId
		? (todosSupervisores.find((s) => s.id === farmacia.supervisorId) ?? null)
		: null;
	const suEmpleados = db
		.select({ id: empleados.id, nombre: empleados.nombre })
		.from(empleados)
		.where(eq(empleados.farmaciaId, id))
		.orderBy(asc(empleados.nombre))
		.all();

	return {
		farmacia,
		members,
		candidates,
		isAdmin,
		supervisores: todosSupervisores,
		supervisorActual,
		empleados: suEmpleados
	};
};

function farmaciaId(params: { id: string }): number {
	const id = Number(params.id);
	if (!Number.isInteger(id)) throw error(404, 'Farmacia no encontrada');
	return id;
}

export const actions: Actions = {
	// Asignar / quitar supervisor. Solo admin (el personal lo gestiona el admin),
	// aunque a esta página también entren los owners de la farmacia.
	setSupervisor: async ({ request, params, locals }) => {
		const id = farmaciaId(params);
		requireManageFarmacia(locals.user, id);
		requireAdmin(locals.user);

		const raw = String((await request.formData()).get('supervisorId') ?? '').trim();
		let supervisorId: number | null = null;
		if (raw !== '') {
			const n = Number(raw);
			if (!Number.isInteger(n) || n <= 0) return fail(400, { supervisorError: 'Supervisor inválido.' });
			// Debe existir: si no, la FK lo rechazaría con un error feo.
			const existe = db.select({ id: supervisores.id }).from(supervisores).where(eq(supervisores.id, n)).get();
			if (!existe) return fail(400, { supervisorError: 'Ese supervisor ya no existe.' });
			supervisorId = n;
		}

		db.update(farmacias).set({ supervisorId }).where(eq(farmacias.id, id)).run();
		return { supervisorSet: true };
	},

	// Guardar (o quitar) la ubicación del mapa. Mismo permiso que renombrar: es
	// un dato de la farmacia, no del personal.
	setUbicacion: async ({ request, params, locals }) => {
		const id = farmaciaId(params);
		requireManageFarmacia(locals.user, id);

		const fd = await request.formData();
		const rawLat = String(fd.get('lat') ?? '').trim();
		const rawLng = String(fd.get('lng') ?? '').trim();

		// Vacío = quitar la ubicación. Se limpian las dos columnas juntas: nunca
		// se guarda media ubicación.
		if (rawLat === '' && rawLng === '') {
			db.update(farmacias).set({ lat: null, lng: null }).where(eq(farmacias.id, id)).run();
			return { ubicacionQuitada: true };
		}

		const lat = Number(rawLat);
		const lng = Number(rawLng);
		if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
			return fail(400, { ubicacionError: 'Latitud fuera de rango.' });
		}
		if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
			return fail(400, { ubicacionError: 'Longitud fuera de rango.' });
		}

		db.update(farmacias).set({ lat, lng }).where(eq(farmacias.id, id)).run();
		return { ubicacionGuardada: true };
	},

	rename: async ({ request, params, locals }) => {
		const id = farmaciaId(params);
		requireManageFarmacia(locals.user, id);
		const fd = await request.formData();
		const nombre = String(fd.get('nombre') ?? '').trim();
		if (!nombre) return fail(400, { nameError: 'El nombre es obligatorio.' });
		db.update(farmacias).set({ nombre }).where(eq(farmacias.id, id)).run();
		return { renamed: true };
	},

	// Permanente. Sus empleados NO se borran: quedan sin asignar (ON DELETE SET
	// NULL), porque son personas y pueden moverse a otra farmacia.
	delete: async ({ params, locals }) => {
		const id = farmaciaId(params);
		requireManageFarmacia(locals.user, id);
		db.delete(farmacias).where(eq(farmacias.id, id)).run();
		throw redirect(303, '/');
	},

	addMember: async ({ request, params, locals }) => {
		const id = farmaciaId(params);
		requireManageFarmacia(locals.user, id);
		const usuarioId = Number((await request.formData()).get('usuarioId'));
		if (!Number.isInteger(usuarioId)) return fail(400, { memberError: 'Usuario inválido.' });
		db.insert(farmaciaMembers).values({ farmaciaId: id, usuarioId }).onConflictDoNothing().run();
		return { memberAdded: true };
	},

	removeMember: async ({ request, params, locals }) => {
		const id = farmaciaId(params);
		requireManageFarmacia(locals.user, id);
		const usuarioId = Number((await request.formData()).get('usuarioId'));
		if (!Number.isInteger(usuarioId)) return fail(400, { memberError: 'Usuario inválido.' });
		db
			.delete(farmaciaMembers)
			.where(and(eq(farmaciaMembers.farmaciaId, id), eq(farmaciaMembers.usuarioId, usuarioId)))
			.run();
		return { memberRemoved: true };
	}
};
