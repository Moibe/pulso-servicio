import { error } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { negocioMembers } from '$lib/server/db/schema';
import type { SessionUser } from '$lib/server/auth';

// Admin-only de verdad (gestión de usuarios, no de un negocio en particular).
export function requireAdmin(user: SessionUser | null): void {
	if (!user?.isAdmin) throw error(403, 'No autorizado');
}

export function isMember(usuarioId: number, negocioId: number): boolean {
	const row = db
		.select({ id: negocioMembers.id })
		.from(negocioMembers)
		.where(and(eq(negocioMembers.usuarioId, usuarioId), eq(negocioMembers.negocioId, negocioId)))
		.get();
	return !!row;
}

// True si es "owner" de ESE negocio (lo creó, o un admin/otro owner lo hizo owner
// desde /settings). Un owner administra su negocio por completo aunque no sea
// admin global.
export function isOwnerNegocio(usuarioId: number, negocioId: number): boolean {
	const row = db
		.select({ id: negocioMembers.id })
		.from(negocioMembers)
		.where(
			and(
				eq(negocioMembers.usuarioId, usuarioId),
				eq(negocioMembers.negocioId, negocioId),
				eq(negocioMembers.rol, 'owner')
			)
		)
		.get();
	return !!row;
}

// Ids de negocios de los que un usuario no-admin es miembro (cualquier rol).
export function memberNegocioIds(usuarioId: number): number[] {
	const rows = db
		.select({ negocioId: negocioMembers.negocioId })
		.from(negocioMembers)
		.where(eq(negocioMembers.usuarioId, usuarioId))
		.all();
	return rows.map((r) => r.negocioId);
}

// Ids de negocios de los que un usuario es "owner" (los creó él mismo).
export function ownerNegocioIds(usuarioId: number): number[] {
	const rows = db
		.select({ negocioId: negocioMembers.negocioId })
		.from(negocioMembers)
		.where(and(eq(negocioMembers.usuarioId, usuarioId), eq(negocioMembers.rol, 'owner')))
		.all();
	return rows.map((r) => r.negocioId);
}

// True si el usuario puede VER este negocio (admin, o miembro con cualquier rol).
export function canSeeNegocio(user: SessionUser | null, negocioId: number): boolean {
	if (!user) return false;
	if (user.isAdmin) return true;
	return isMember(user.id, negocioId);
}

// True si el usuario puede ADMINISTRAR este negocio (admin global, u owner de
// ese negocio en particular). Un "member" normal sigue siendo de solo lectura.
export function canManageNegocio(user: SessionUser | null, negocioId: number): boolean {
	if (!user) return false;
	if (user.isAdmin) return true;
	return isOwnerNegocio(user.id, negocioId);
}

export function requireManageNegocio(user: SessionUser | null, negocioId: number): void {
	if (!canManageNegocio(user, negocioId)) throw error(403, 'No autorizado');
}
