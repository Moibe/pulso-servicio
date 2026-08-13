import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { asc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { usuarios, farmacias, farmaciaMembers } from '$lib/server/db/schema';
import { verifyPassword, hashPassword } from '$lib/server/auth';

export const load: PageServerLoad = async ({ locals }) => {
	const me = locals.user!;
	const row = db.select({ creadoEn: usuarios.creadoEn }).from(usuarios).where(eq(usuarios.id, me.id)).get();

	// Farmacias en los que está: los admins están efectivamente en todos; los demás
	// solo los que tengan asignados.
	let farmaciaNombres: string[];
	if (me.isAdmin) {
		farmaciaNombres = db.select({ nombre: farmacias.nombre }).from(farmacias).orderBy(asc(farmacias.nombre)).all().map((r) => r.nombre);
	} else {
		farmaciaNombres = db
			.select({ nombre: farmacias.nombre })
			.from(farmaciaMembers)
			.innerJoin(farmacias, eq(farmaciaMembers.farmaciaId, farmacias.id))
			.where(eq(farmaciaMembers.usuarioId, me.id))
			.orderBy(asc(farmacias.nombre))
			.all()
			.map((r) => r.nombre);
	}

	return {
		username: me.username,
		isAdmin: me.isAdmin,
		creadoEn: row?.creadoEn ?? null,
		farmaciaNombres
	};
};

export const actions: Actions = {
	changePassword: async ({ request, locals }) => {
		const me = locals.user!;
		const fd = await request.formData();
		const current = String(fd.get('current') ?? '');
		const next = String(fd.get('next') ?? '');
		const confirm = String(fd.get('confirm') ?? '');

		if (next.length < 4) {
			return fail(400, { pwError: 'La nueva contraseña debe tener al menos 4 caracteres.' });
		}
		if (next !== confirm) return fail(400, { pwError: 'Las contraseñas nuevas no coinciden.' });

		const row = db.select({ passwordHash: usuarios.passwordHash }).from(usuarios).where(eq(usuarios.id, me.id)).get();
		if (!row || !verifyPassword(current, row.passwordHash)) {
			return fail(400, { pwError: 'La contraseña actual es incorrecta.' });
		}

		db.update(usuarios).set({ passwordHash: hashPassword(next) }).where(eq(usuarios.id, me.id)).run();
		return { pwChanged: true };
	}
};
