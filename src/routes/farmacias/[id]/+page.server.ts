import { error, fail } from '@sveltejs/kit';
import { and, asc, eq, desc, isNull } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { menus, supervisores, empleados, farmacias } from '$lib/server/db/schema';
import { resolveFarmacia } from '$lib/server/farmacia-context';
import {
	canManageFarmacia,
	requireAdmin,
	requireManageFarmacia,
	canSeeFarmacia
} from '$lib/server/access';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const farmacia = resolveFarmacia(params.id, locals.user);

	const lista = db
		.select()
		.from(menus)
		.where(eq(menus.farmaciaId, farmacia.id))
		.orderBy(desc(menus.creadoEn))
		.all();

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

	return {
		farmacia,
		menus: lista,
		canManage: canManageFarmacia(locals.user, farmacia.id),
		isAdmin,
		supervisorActual,
		empleados: suEmpleados,
		supervisores: todosSupervisores,
		empleadosLibres
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

export const actions: Actions = {
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
	},

	agregarMenu: async ({ request, params, locals }) => {
		const id = Number(params.id);
		if (!Number.isInteger(id) || !canSeeFarmacia(locals.user, id)) {
			return fail(404, { error: 'Farmacia no encontrada' });
		}
		requireManageFarmacia(locals.user, id);

		const data = await request.formData();
		const nombre = String(data.get('nombre') ?? '').trim();
		if (!nombre) return fail(400, { error: 'El nombre del menú no puede estar vacío.' });

		db.insert(menus).values({ farmaciaId: id, nombre }).run();
		return { success: true };
	},

	renombrarMenu: async ({ request, params, locals }) => {
		const id = Number(params.id);
		if (!Number.isInteger(id) || !canSeeFarmacia(locals.user, id)) {
			return fail(404, { error: 'Farmacia no encontrada' });
		}
		requireManageFarmacia(locals.user, id);

		const data = await request.formData();
		const menuId = Number(data.get('menuId'));
		const nombre = String(data.get('nombre') ?? '').trim();
		if (!Number.isInteger(menuId)) return fail(400, { error: 'Menú inválido' });
		if (!nombre) return fail(400, { error: 'El nombre del menú no puede estar vacío.' });

		// El menú debe pertenecer a esta farmacia.
		const menu = db
			.select()
			.from(menus)
			.where(and(eq(menus.id, menuId), eq(menus.farmaciaId, id)))
			.get();
		if (!menu) return fail(404, { error: 'Menú no encontrado' });

		db.update(menus).set({ nombre }).where(eq(menus.id, menuId)).run();
		return { success: true };
	}
};
