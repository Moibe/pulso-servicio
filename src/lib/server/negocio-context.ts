import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { negocios, menus, type Negocio, type Menu } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { SessionUser } from '$lib/server/auth';
import { canSeeNegocio } from '$lib/server/access';

// Resuelve el segmento [id] de la ruta a un negocio Y aplica la visibilidad:
// admins ven cualquier negocio; usuarios normales solo los que son miembro.
// No autorizado / inexistente → 404 (no revela si existe).
export function resolveNegocio(param: string, user: SessionUser | null): Negocio {
	const id = Number(param);
	if (!Number.isInteger(id) || id <= 0) throw error(404, 'Negocio no encontrado');

	const negocio = db.select().from(negocios).where(eq(negocios.id, id)).get();
	if (!negocio) throw error(404, 'Negocio no encontrado');

	if (!canSeeNegocio(user, id)) throw error(404, 'Negocio no encontrado');

	return negocio;
}

// Igual que resolveNegocio, pero para un menú: la visibilidad la da el negocio
// al que pertenece (un menú no tiene visibilidad propia).
export function resolveMenu(param: string, user: SessionUser | null): Menu {
	const id = Number(param);
	if (!Number.isInteger(id) || id <= 0) throw error(404, 'Menú no encontrado');

	const menu = db.select().from(menus).where(eq(menus.id, id)).get();
	if (!menu) throw error(404, 'Menú no encontrado');

	if (!canSeeNegocio(user, menu.negocioId)) throw error(404, 'Menú no encontrado');

	return menu;
}
