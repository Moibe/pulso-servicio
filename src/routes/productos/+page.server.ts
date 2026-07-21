import { fail } from '@sveltejs/kit';
import { eq, inArray, desc } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { productos, menus, negocios } from '$lib/server/db/schema';
import { memberNegocioIds, ownerNegocioIds, requireManageNegocio } from '$lib/server/access';
import type { Actions, PageServerLoad } from './$types';

// Todos los productos que el usuario puede ver (admins: todos; usuarios normales:
// solo los de sus negocios asignados), con su menú, negocio y si lo puede administrar.
export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user!;
	let scope;
	if (!user.isAdmin) {
		const ids = memberNegocioIds(user.id);
		if (ids.length === 0) return { productos: [] };
		scope = inArray(negocios.id, ids);
	}

	const lista = db
		.select({
			id: productos.id,
			nombre: productos.nombre,
			precio: productos.precio,
			fotoPrincipal: productos.fotoPrincipal,
			menuId: productos.menuId,
			menuNombre: menus.nombre,
			negocioId: negocios.id,
			negocioNombre: negocios.nombre
		})
		.from(productos)
		.innerJoin(menus, eq(productos.menuId, menus.id))
		.innerJoin(negocios, eq(menus.negocioId, negocios.id))
		.where(scope)
		.orderBy(desc(productos.creadoEn))
		.all();

	const ownedIds = user.isAdmin ? null : new Set(ownerNegocioIds(user.id));
	return {
		productos: lista.map((p) => ({ ...p, canManage: user.isAdmin || ownedIds!.has(p.negocioId) }))
	};
};

export const actions: Actions = {
	renombrarProducto: async ({ request, locals }) => {
		const data = await request.formData();
		const productoId = Number(data.get('productoId'));
		const nombre = String(data.get('nombre') ?? '').trim();
		if (!Number.isInteger(productoId)) return fail(400, { error: 'Producto inválido' });
		if (!nombre) return fail(400, { error: 'El nombre del producto no puede estar vacío.' });

		const row = db
			.select({ id: productos.id, negocioId: menus.negocioId })
			.from(productos)
			.innerJoin(menus, eq(productos.menuId, menus.id))
			.where(eq(productos.id, productoId))
			.get();
		if (!row) return fail(404, { error: 'Producto no encontrado' });
		requireManageNegocio(locals.user, row.negocioId);

		db.update(productos).set({ nombre }).where(eq(productos.id, productoId)).run();
		return { success: true };
	}
};
