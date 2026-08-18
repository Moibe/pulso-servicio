import { error, fail, redirect } from '@sveltejs/kit';
import { and, asc, eq, isNull } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { supervisores, empleados, farmacias, farmaciaMembers, usuarios } from '$lib/server/db/schema';
import { resolveFarmacia } from '$lib/server/farmacia-context';
import { canManageFarmacia, requireAdmin, requireManageFarmacia, canSeeFarmacia } from '$lib/server/access';
import type { Actions, PageServerLoad } from './$types';

// Ficha de la farmacia: TODO lo suyo se ve y se edita aquí (antes la mitad vivía
// en /farmacias/[id]/settings, que era redundante). Tres niveles de permiso:
//   - ver:        cualquiera que pueda ver la farmacia (admin o miembro).
//   - administrar: admin global u owner de esta farmacia → nombre, ubicación,
//                  miembros y borrar.
//   - personal:   solo admin → supervisor y empleados (se gestionan centralizado
//                 desde /supervisores y /empleados).
export const load: PageServerLoad = async ({ params, locals }) => {
	const farmacia = resolveFarmacia(params.id, locals.user);

	// Personal de esta farmacia. Se muestra a quien pueda ver la farmacia, pero
	// solo el admin puede modificarlo (el personal se gestiona centralizado).
	const supervisorActual = farmacia.supervisorId
		? (db
				.select({ id: supervisores.id, nombre: supervisores.nombre })
				.from(supervisores)
				.where(eq(supervisores.id, farmacia.supervisorId))
				.get() ?? null)
		: null;

	const suEmpleados = db
		.select({ id: empleados.id, nombre: empleados.nombre, creadoEn: empleados.creadoEn })
		.from(empleados)
		.where(eq(empleados.farmaciaId, farmacia.id))
		.orderBy(asc(empleados.nombre))
		.all();

	const isAdmin = !!locals.user?.isAdmin;
	const canManage = canManageFarmacia(locals.user, farmacia.id);

	// Catálogos solo para el admin (son los que alimentan los selects).
	const todosSupervisores = isAdmin
		? db
				.select({ id: supervisores.id, nombre: supervisores.nombre })
				.from(supervisores)
				.orderBy(asc(supervisores.nombre))
				.all()
		: [];
	// Empleados que hoy no están en ninguna farmacia: se pueden mover a ésta.
	const empleadosLibres = isAdmin
		? db
				.select({ id: empleados.id, nombre: empleados.nombre })
				.from(empleados)
				.where(isNull(empleados.farmaciaId))
				.orderBy(asc(empleados.nombre))
				.all()
		: [];

	// Miembros (quién puede ver la farmacia): solo para quien la administra. A un
	// miembro de solo lectura no se le manda la lista de usuarios del sistema.
	let members: { id: number; username: string; isAdmin: boolean; rol: string | undefined }[] = [];
	let candidates: { id: number; username: string; isAdmin: boolean }[] = [];
	if (canManage) {
		const memberRows = db
			.select({ usuarioId: farmaciaMembers.usuarioId, rol: farmaciaMembers.rol })
			.from(farmaciaMembers)
			.where(eq(farmaciaMembers.farmaciaId, farmacia.id))
			.all();
		const memberRoles = new Map(memberRows.map((r) => [r.usuarioId, r.rol]));

		const allUsers = db
			.select({ id: usuarios.id, username: usuarios.username, isAdmin: usuarios.isAdmin })
			.from(usuarios)
			.orderBy(asc(usuarios.username))
			.all();

		// Los admins ya ven todo, así que no se ofrecen como miembros.
		members = allUsers
			.filter((u) => memberRoles.has(u.id))
			.map((u) => ({ ...u, rol: memberRoles.get(u.id) }));
		candidates = allUsers.filter((u) => !u.isAdmin && !memberRoles.has(u.id));
	}

	return {
		farmacia,
		canManage,
		isAdmin,
		supervisorActual,
		empleados: suEmpleados,
		supervisores: todosSupervisores,
		empleadosLibres,
		members,
		candidates
	};
};

// El personal solo lo toca el admin, y siempre sobre una farmacia visible.
// Lanza (no devuelve fail): `fail` es para RETORNARLO desde la action.
function requireAdminSobreFarmacia(locals: App.Locals, params: { id: string }): number {
	const id = Number(params.id);
	if (!Number.isInteger(id) || !canSeeFarmacia(locals.user, id)) {
		throw error(404, 'Farmacia no encontrada');
	}
	requireAdmin(locals.user);
	return id;
}

// Datos de la farmacia en sí (nombre, ubicación, miembros, borrado): admin global
// u owner de ESTA farmacia. Un "member" de solo lectura no pasa de aquí.
function requireGestionSobreFarmacia(locals: App.Locals, params: { id: string }): number {
	const id = Number(params.id);
	if (!Number.isInteger(id) || !canSeeFarmacia(locals.user, id)) {
		throw error(404, 'Farmacia no encontrada');
	}
	requireManageFarmacia(locals.user, id);
	return id;
}

export const actions: Actions = {
	// ── Datos de la farmacia ────────────────────────────────────────────────────
	renombrar: async ({ request, params, locals }) => {
		const id = requireGestionSobreFarmacia(locals, params);
		const nombre = String((await request.formData()).get('nombre') ?? '').trim();
		if (!nombre) return fail(400, { nombreError: 'El nombre no puede estar vacío.' });

		db.update(farmacias).set({ nombre }).where(eq(farmacias.id, id)).run();
		return { renombrada: true };
	},

	// Guardar (o quitar) la ubicación del mapa.
	setUbicacion: async ({ request, params, locals }) => {
		const id = requireGestionSobreFarmacia(locals, params);

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

	// Permanente. Sus empleados NO se borran: quedan sin asignar (ON DELETE SET
	// NULL), porque son personas y pueden moverse a otra farmacia.
	borrar: async ({ params, locals }) => {
		const id = requireGestionSobreFarmacia(locals, params);
		db.delete(farmacias).where(eq(farmacias.id, id)).run();
		throw redirect(303, '/');
	},

	// ── Miembros (quién puede VER esta farmacia) ────────────────────────────────
	addMember: async ({ request, params, locals }) => {
		const id = requireGestionSobreFarmacia(locals, params);
		const usuarioId = Number((await request.formData()).get('usuarioId'));
		if (!Number.isInteger(usuarioId)) return fail(400, { memberError: 'Usuario inválido.' });

		db.insert(farmaciaMembers).values({ farmaciaId: id, usuarioId }).onConflictDoNothing().run();
		return { memberAdded: true };
	},

	removeMember: async ({ request, params, locals }) => {
		const id = requireGestionSobreFarmacia(locals, params);
		const usuarioId = Number((await request.formData()).get('usuarioId'));
		if (!Number.isInteger(usuarioId)) return fail(400, { memberError: 'Usuario inválido.' });

		db
			.delete(farmaciaMembers)
			.where(and(eq(farmaciaMembers.farmaciaId, id), eq(farmaciaMembers.usuarioId, usuarioId)))
			.run();
		return { memberRemoved: true };
	},

	// ── Personal ────────────────────────────────────────────────────────────────
	// Asignar (o quitar, con '') el supervisor de esta farmacia. Un supervisor
	// puede quedar asignado a varias farmacias a la vez: es lo esperado.
	asignarSupervisor: async ({ request, params, locals }) => {
		const id = requireAdminSobreFarmacia(locals, params);

		const raw = String((await request.formData()).get('supervisorId') ?? '').trim();
		let supervisorId: number | null = null;
		if (raw !== '') {
			const n = Number(raw);
			if (!Number.isInteger(n) || n <= 0) return fail(400, { personalError: 'Supervisor inválido.' });
			// Comprobarlo antes: si no existe, la FK tiraría un 500 crudo.
			const existe = db.select({ id: supervisores.id }).from(supervisores).where(eq(supervisores.id, n)).get();
			if (!existe) return fail(400, { personalError: 'Ese supervisor ya no existe.' });
			supervisorId = n;
		}

		db.update(farmacias).set({ supervisorId }).where(eq(farmacias.id, id)).run();
		return { personalOk: true };
	},

	// Alta de un empleado NUEVO, ya asignado a esta farmacia.
	crearEmpleado: async ({ request, params, locals }) => {
		const id = requireAdminSobreFarmacia(locals, params);

		const nombre = String((await request.formData()).get('nombre') ?? '').trim();
		if (!nombre) return fail(400, { personalError: 'El nombre del empleado no puede estar vacío.' });

		db.insert(empleados).values({ nombre, farmaciaId: id }).run();
		return { personalOk: true };
	},

	// Mover a esta farmacia un empleado que hoy no tiene ninguna.
	asignarEmpleado: async ({ request, params, locals }) => {
		const id = requireAdminSobreFarmacia(locals, params);

		const empleadoId = Number((await request.formData()).get('empleadoId'));
		if (!Number.isInteger(empleadoId)) return fail(400, { personalError: 'Empleado inválido.' });
		const existe = db.select({ id: empleados.id }).from(empleados).where(eq(empleados.id, empleadoId)).get();
		if (!existe) return fail(400, { personalError: 'Ese empleado ya no existe.' });

		db.update(empleados).set({ farmaciaId: id }).where(eq(empleados.id, empleadoId)).run();
		return { personalOk: true };
	},

	// Quitarlo de esta farmacia NO lo borra: queda "sin asignar" y se puede
	// mover a otra. Para borrarlo de verdad está /empleados.
	quitarEmpleado: async ({ request, params, locals }) => {
		const id = requireAdminSobreFarmacia(locals, params);

		const empleadoId = Number((await request.formData()).get('empleadoId'));
		if (!Number.isInteger(empleadoId)) return fail(400, { personalError: 'Empleado inválido.' });

		// Solo si de verdad pertenece a ESTA farmacia (evita tocar la de otra).
		db.update(empleados)
			.set({ farmaciaId: null })
			.where(and(eq(empleados.id, empleadoId), eq(empleados.farmaciaId, id)))
			.run();
		return { personalOk: true };
	}
};
