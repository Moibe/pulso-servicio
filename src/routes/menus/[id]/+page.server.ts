import { fail } from '@sveltejs/kit';
import { and, eq, desc, inArray } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { negocios, productos, productoFotos } from '$lib/server/db/schema';
import { saveImage, MediaError } from '$lib/server/media';
import { resolveMenu } from '$lib/server/negocio-context';
import { canManageNegocio, requireManageNegocio } from '$lib/server/access';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const menu = resolveMenu(params.id, locals.user);
	const negocio = db.select().from(negocios).where(eq(negocios.id, menu.negocioId)).get();
	const canManage = canManageNegocio(locals.user, menu.negocioId);

	const lista = db
		.select()
		.from(productos)
		.where(eq(productos.menuId, menu.id))
		.orderBy(desc(productos.creadoEn))
		.all();

	// Fotos adicionales de todos los productos, agrupadas por producto.
	const ids = lista.map((p) => p.id);
	const fotos = ids.length
		? db.select().from(productoFotos).where(inArray(productoFotos.productoId, ids)).all()
		: [];
	const fotosPorProducto = new Map<number, typeof fotos>();
	for (const f of fotos) {
		const arr = fotosPorProducto.get(f.productoId) ?? [];
		arr.push(f);
		fotosPorProducto.set(f.productoId, arr);
	}

	return {
		menu,
		negocio,
		canManage,
		productos: lista.map((p) => ({ ...p, fotos: fotosPorProducto.get(p.id) ?? [] }))
	};
};

export const actions: Actions = {
	agregarProducto: async ({ request, params, locals }) => {
		const menu = resolveMenu(params.id, locals.user);
		requireManageNegocio(locals.user, menu.negocioId);

		const data = await request.formData();
		const nombre = String(data.get('nombre') ?? '').trim();
		if (!nombre) return fail(400, { error: 'El nombre del producto es obligatorio.' });

		const precioRaw = String(data.get('precio') ?? '').trim();
		let precio: number | null = null;
		if (precioRaw) {
			precio = Number(precioRaw);
			if (Number.isNaN(precio) || precio < 0) {
				return fail(400, { error: 'El precio no es válido.' });
			}
		}

		const principal = data.get('fotoPrincipal');
		const adicionales = data.getAll('fotosAdicionales');

		try {
			let fotoPrincipal: string | null = null;
			if (principal instanceof File && principal.size > 0) {
				fotoPrincipal = await saveImage(principal, 'productos');
			}

			const producto = db
				.insert(productos)
				.values({ menuId: menu.id, nombre, precio, fotoPrincipal })
				.returning()
				.get();

			let orden = 0;
			for (const f of adicionales) {
				if (f instanceof File && f.size > 0) {
					const url = await saveImage(f, 'productos');
					db.insert(productoFotos).values({ productoId: producto.id, url, orden: orden++ }).run();
				}
			}
		} catch (e) {
			if (e instanceof MediaError) return fail(e.status, { error: e.message });
			throw e;
		}

		return { success: true };
	},

	renombrarProducto: async ({ request, params, locals }) => {
		const menu = resolveMenu(params.id, locals.user);
		requireManageNegocio(locals.user, menu.negocioId);

		const data = await request.formData();
		const productoId = Number(data.get('productoId'));
		const nombre = String(data.get('nombre') ?? '').trim();
		if (!Number.isInteger(productoId)) return fail(400, { error: 'Producto inválido' });
		if (!nombre) return fail(400, { error: 'El nombre del producto no puede estar vacío.' });

		// El producto debe pertenecer a este menú.
		const producto = db
			.select()
			.from(productos)
			.where(and(eq(productos.id, productoId), eq(productos.menuId, menu.id)))
			.get();
		if (!producto) return fail(404, { error: 'Producto no encontrado' });

		db.update(productos).set({ nombre }).where(eq(productos.id, productoId)).run();
		return { success: true };
	}
};
