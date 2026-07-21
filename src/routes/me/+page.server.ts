import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { asc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { usuarios, negocios, negocioMembers } from '$lib/server/db/schema';
import { verifyPassword, hashPassword } from '$lib/server/auth';

export const load: PageServerLoad = async ({ locals }) => {
	const me = locals.user!;
	const row = db.select({ creadoEn: usuarios.creadoEn }).from(usuarios).where(eq(usuarios.id, me.id)).get();

	// Negocios en los que está: los admins están efectivamente en todos; los demás
	// solo los que tengan asignados.
	let negocioNombres: string[];
	if (me.isAdmin) {
		negocioNombres = db.select({ nombre: negocios.nombre }).from(negocios).orderBy(asc(negocios.nombre)).all().map((r) => r.nombre);
	} else {
		negocioNombres = db
			.select({ nombre: negocios.nombre })
			.from(negocioMembers)
			.innerJoin(negocios, eq(negocioMembers.negocioId, negocios.id))
			.where(eq(negocioMembers.usuarioId, me.id))
			.orderBy(asc(negocios.nombre))
			.all()
			.map((r) => r.nombre);
	}

	return {
		username: me.username,
		isAdmin: me.isAdmin,
		creadoEn: row?.creadoEn ?? null,
		negocioNombres
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
