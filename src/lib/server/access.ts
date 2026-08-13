import { error } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { farmaciaMembers } from '$lib/server/db/schema';
import type { SessionUser } from '$lib/server/auth';

// Admin-only de verdad (gestión de usuarios, no de una farmacia en particular).
export function requireAdmin(user: SessionUser | null): void {
	if (!user?.isAdmin) throw error(403, 'No autorizado');
}

export function isMember(usuarioId: number, farmaciaId: number): boolean {
	const row = db
		.select({ id: farmaciaMembers.id })
		.from(farmaciaMembers)
		.where(and(eq(farmaciaMembers.usuarioId, usuarioId), eq(farmaciaMembers.farmaciaId, farmaciaId)))
		.get();
	return !!row;
}

// True si es "owner" de ESA farmacia (la creó, o un admin/otro owner lo hizo owner
// desde /settings). Un owner administra su farmacia por completo aunque no sea
// admin global.
export function isOwnerFarmacia(usuarioId: number, farmaciaId: number): boolean {
	const row = db
		.select({ id: farmaciaMembers.id })
		.from(farmaciaMembers)
		.where(
			and(
				eq(farmaciaMembers.usuarioId, usuarioId),
				eq(farmaciaMembers.farmaciaId, farmaciaId),
				eq(farmaciaMembers.rol, 'owner')
			)
		)
		.get();
	return !!row;
}

// Ids de farmacias de las que un usuario no-admin es miembro (cualquier rol).
export function memberFarmaciaIds(usuarioId: number): number[] {
	const rows = db
		.select({ farmaciaId: farmaciaMembers.farmaciaId })
		.from(farmaciaMembers)
		.where(eq(farmaciaMembers.usuarioId, usuarioId))
		.all();
	return rows.map((r) => r.farmaciaId);
}

// Ids de farmacias de las que un usuario es "owner" (las creó él mismo).
export function ownerFarmaciaIds(usuarioId: number): number[] {
	const rows = db
		.select({ farmaciaId: farmaciaMembers.farmaciaId })
		.from(farmaciaMembers)
		.where(and(eq(farmaciaMembers.usuarioId, usuarioId), eq(farmaciaMembers.rol, 'owner')))
		.all();
	return rows.map((r) => r.farmaciaId);
}

// True si el usuario puede VER esta farmacia (admin, o miembro con cualquier rol).
export function canSeeFarmacia(user: SessionUser | null, farmaciaId: number): boolean {
	if (!user) return false;
	if (user.isAdmin) return true;
	return isMember(user.id, farmaciaId);
}

// True si el usuario puede ADMINISTRAR esta farmacia (admin global, u owner de
// esa farmacia en particular). Un "member" normal sigue siendo de solo lectura.
export function canManageFarmacia(user: SessionUser | null, farmaciaId: number): boolean {
	if (!user) return false;
	if (user.isAdmin) return true;
	return isOwnerFarmacia(user.id, farmaciaId);
}

export function requireManageFarmacia(user: SessionUser | null, farmaciaId: number): void {
	if (!canManageFarmacia(user, farmaciaId)) throw error(403, 'No autorizado');
}
