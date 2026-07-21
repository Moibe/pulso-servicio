import type { Cookies } from '@sveltejs/kit';
import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { usuarios, sessions } from '$lib/server/db/schema';

const DAY = 1000 * 60 * 60 * 24;
const SESSION_TTL = 30 * DAY;
const REFRESH_THRESHOLD = 15 * DAY; // se extiende cuando queda menos que esto
export const SESSION_COOKIE = 'session';

export type SessionUser = { id: number; username: string; isAdmin: boolean };

// ── Contraseñas (scrypt, salt:hash en hex) ───────────────────────────────────
export function hashPassword(password: string): string {
	const salt = randomBytes(16);
	const hash = scryptSync(password, salt, 64);
	return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
	const [saltHex, hashHex] = stored.split(':');
	if (!saltHex || !hashHex) return false;
	const hash = scryptSync(password, Buffer.from(saltHex, 'hex'), 64);
	const expected = Buffer.from(hashHex, 'hex');
	return hash.length === expected.length && timingSafeEqual(hash, expected);
}

// ── Sesiones ──────────────────────────────────────────────────────────────────
export function generateSessionToken(): string {
	return randomBytes(32).toString('base64url');
}

// La cookie guarda el token crudo; la DB solo guarda su SHA-256, así que una
// fuga de la DB no se puede usar para suplantar a nadie.
const sessionId = (token: string) => createHash('sha256').update(token).digest('hex');

export function createSession(token: string, usuarioId: number) {
	const id = sessionId(token);
	const expiresAt = Date.now() + SESSION_TTL;
	db.insert(sessions).values({ id, usuarioId, expiresAt }).run();
	return { id, usuarioId, expiresAt };
}

export function validateSessionToken(
	token: string
): { session: { id: string; usuarioId: number; expiresAt: number } | null; user: SessionUser | null } {
	const id = sessionId(token);
	const row = db.select().from(sessions).where(eq(sessions.id, id)).get();
	if (!row) return { session: null, user: null };

	if (Date.now() >= row.expiresAt) {
		db.delete(sessions).where(eq(sessions.id, id)).run();
		return { session: null, user: null };
	}

	let expiresAt = row.expiresAt;
	if (Date.now() >= row.expiresAt - REFRESH_THRESHOLD) {
		expiresAt = Date.now() + SESSION_TTL;
		db.update(sessions).set({ expiresAt }).where(eq(sessions.id, id)).run();
	}

	const u = db
		.select({ id: usuarios.id, username: usuarios.username, isAdmin: usuarios.isAdmin })
		.from(usuarios)
		.where(eq(usuarios.id, row.usuarioId))
		.get();
	if (!u) {
		db.delete(sessions).where(eq(sessions.id, id)).run();
		return { session: null, user: null };
	}

	return { session: { id, usuarioId: row.usuarioId, expiresAt }, user: u };
}

export function invalidateSession(id: string) {
	db.delete(sessions).where(eq(sessions.id, id)).run();
}

export function setSessionCookie(cookies: Cookies, token: string, expiresAt: number) {
	cookies.set(SESSION_COOKIE, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		expires: new Date(expiresAt)
	});
}

export function deleteSessionCookie(cookies: Cookies) {
	cookies.delete(SESSION_COOKIE, { path: '/' });
}
