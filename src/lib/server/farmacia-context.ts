import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { farmacias, type Farmacia } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { SessionUser } from '$lib/server/auth';
import { canSeeFarmacia } from '$lib/server/access';

// Resuelve el segmento [id] de la ruta a una farmacia Y aplica la visibilidad:
// admins ven cualquier farmacia; usuarios normales solo aquellas de las que son miembro.
// No autorizado / inexistente → 404 (no revela si existe).
export function resolveFarmacia(param: string, user: SessionUser | null): Farmacia {
	const id = Number(param);
	if (!Number.isInteger(id) || id <= 0) throw error(404, 'Farmacia no encontrada');

	const farmacia = db.select().from(farmacias).where(eq(farmacias.id, id)).get();
	if (!farmacia) throw error(404, 'Farmacia no encontrada');

	if (!canSeeFarmacia(user, id)) throw error(404, 'Farmacia no encontrada');

	return farmacia;
}
