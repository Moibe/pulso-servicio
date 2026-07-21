import type { Handle } from '@sveltejs/kit';
import {
	SESSION_COOKIE,
	validateSessionToken,
	setSessionCookie,
	deleteSessionCookie
} from '$lib/server/auth';

// Rellena locals.user/session desde la cookie de sesión en cada request. El guard
// de rutas (redirect a /login) vive en el +layout.server.ts raíz.
export const handle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get(SESSION_COOKIE);
	if (!token) {
		event.locals.user = null;
		event.locals.session = null;
		return resolve(event);
	}

	const { session, user } = validateSessionToken(token);
	if (session && user) {
		setSessionCookie(event.cookies, token, session.expiresAt); // mantiene la cookie fresca
		event.locals.user = user;
		event.locals.session = session;
	} else {
		deleteSessionCookie(event.cookies);
		event.locals.user = null;
		event.locals.session = null;
	}

	return resolve(event);
};
