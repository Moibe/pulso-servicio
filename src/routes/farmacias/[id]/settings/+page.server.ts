import type { Actions, PageServerLoad } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { farmacias, usuarios, farmaciaMembers } from '$lib/server/db/schema';
import { and, asc, eq } from 'drizzle-orm';
import { requireManageFarmacia } from '$lib/server/access';

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

	return { farmacia, members, candidates };
};

function farmaciaId(params: { id: string }): number {
	const id = Number(params.id);
	if (!Number.isInteger(id)) throw error(404, 'Farmacia no encontrada');
	return id;
}

export const actions: Actions = {
	rename: async ({ request, params, locals }) => {
		const id = farmaciaId(params);
		requireManageFarmacia(locals.user, id);
		const fd = await request.formData();
		const nombre = String(fd.get('nombre') ?? '').trim();
		if (!nombre) return fail(400, { nameError: 'El nombre es obligatorio.' });
		db.update(farmacias).set({ nombre }).where(eq(farmacias.id, id)).run();
		return { renamed: true };
	},

	// Permanente: se lleva en cascada sus menús y productos.
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
