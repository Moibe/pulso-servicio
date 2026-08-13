import { fail } from '@sveltejs/kit';
import { eq, inArray, desc } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { productos, menus, farmacias } from '$lib/server/db/schema';
import { memberFarmaciaIds, ownerFarmaciaIds, requireManageFarmacia } from '$lib/server/access';
import type { Actions, PageServerLoad } from './$types';

// Todos los productos que el usuario puede ver (admins: todos; usuarios normales:
// solo los de sus farmacias asignadas), con su menú, farmacia y si lo puede administrar.
export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user!;
	let scope;
	if (!user.isAdmin) {
		const ids = memberFarmaciaIds(user.id);
		if (ids.length === 0) return { productos: [] };
		scope = inArray(farmacias.id, ids);
	}

	const lista = db
		.select({
			id: productos.id,
			nombre: productos.nombre,
			precio: productos.precio,
			fotoPrincipal: productos.fotoPrincipal,
			menuId: productos.menuId,
			menuNombre: menus.nombre,
			farmaciaId: farmacias.id,
			farmaciaNombre: farmacias.nombre
		})
		.from(productos)
		.innerJoin(menus, eq(productos.menuId, menus.id))
		.innerJoin(farmacias, eq(menus.farmaciaId, farmacias.id))
		.where(scope)
		.orderBy(desc(productos.creadoEn))
		.all();

	const ownedIds = user.isAdmin ? null : new Set(ownerFarmaciaIds(user.id));
	return {
		productos: lista.map((p) => ({ ...p, canManage: user.isAdmin || ownedIds!.has(p.farmaciaId) }))
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
			.select({ id: productos.id, farmaciaId: menus.farmaciaId })
			.from(productos)
			.innerJoin(menus, eq(productos.menuId, menus.id))
			.where(eq(productos.id, productoId))
			.get();
		if (!row) return fail(404, { error: 'Producto no encontrado' });
		requireManageFarmacia(locals.user, row.farmaciaId);

		db.update(productos).set({ nombre }).where(eq(productos.id, productoId)).run();
		return { success: true };
	}
};
