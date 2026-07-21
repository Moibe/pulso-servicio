import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { asc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { usuarios } from '$lib/server/db/schema';
import { hashPassword } from '$lib/server/auth';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user?.isAdmin) throw redirect(303, '/');

	const list = db
		.select({
			id: usuarios.id,
			username: usuarios.username,
			isAdmin: usuarios.isAdmin,
			creadoEn: usuarios.creadoEn
		})
		.from(usuarios)
		.orderBy(asc(usuarios.username))
		.all();
	return { users: list };
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		if (!locals.user?.isAdmin) throw redirect(303, '/');

		const fd = await request.formData();
		const username = String(fd.get('username') ?? '').trim();
		const password = String(fd.get('password') ?? '');
		const makeAdmin = fd.get('isAdmin') != null;
		if (!username) return fail(400, { createError: 'El usuario es obligatorio.', username });
		if (password.length < 4) {
			return fail(400, { createError: 'La contraseña debe tener al menos 4 caracteres.', username });
		}
		try {
			db.insert(usuarios).values({ username, passwordHash: hashPassword(password), isAdmin: makeAdmin }).run();
		} catch {
			return fail(409, { createError: `El usuario "${username}" ya existe.`, username });
		}
		return { created: true };
	},

	editUser: async ({ request, locals }) => {
		if (!locals.user?.isAdmin) throw redirect(303, '/');

		const fd = await request.formData();
		const userId = Number(fd.get('userId'));
		const username = String(fd.get('username') ?? '').trim();
		const password = String(fd.get('password') ?? '');
		if (!Number.isInteger(userId)) return fail(400, { editError: 'Usuario inválido.', editUserId: userId });
		if (!username) return fail(400, { editError: 'El usuario es obligatorio.', editUserId: userId });
		if (password && password.length < 4) {
			return fail(400, { editError: 'La contraseña debe tener al menos 4 caracteres.', editUserId: userId });
		}

		try {
			db
				.update(usuarios)
				.set(password ? { username, passwordHash: hashPassword(password) } : { username })
				.where(eq(usuarios.id, userId))
				.run();
		} catch {
			return fail(409, { editError: `El usuario "${username}" ya existe.`, editUserId: userId });
		}
		return { edited: true };
	},

	delete: async ({ request, locals }) => {
		if (!locals.user?.isAdmin) throw redirect(303, '/');

		const userId = Number((await request.formData()).get('userId'));
		if (!Number.isInteger(userId)) return fail(400, { deleteError: 'Usuario inválido.' });
		if (locals.user?.id === userId) {
			return fail(409, { deleteError: 'No puedes borrar tu propio usuario.' });
		}
		db.delete(usuarios).where(eq(usuarios.id, userId)).run();
		return { deleted: true };
	}
};
