import Database from 'better-sqlite3';
import { randomBytes, scryptSync } from 'node:crypto';

// Primer admin (solo si no hay ningún usuario todavía). Mismo formato scrypt
// "salt:hash" que src/lib/server/auth.ts. CAMBIA ESTA CONTRASEÑA al primer login.
const url = process.env.DATABASE_URL ?? './local.db';
const db = new Database(url);
db.pragma('foreign_keys = ON');

const hashPw = (pw) => {
	const salt = randomBytes(16);
	return `${salt.toString('hex')}:${scryptSync(pw, salt, 64).toString('hex')}`;
};

if (db.prepare('SELECT COUNT(*) AS n FROM usuarios').get().n === 0) {
	db.prepare('INSERT INTO usuarios (username, password_hash, is_admin, creado_en) VALUES (?, ?, 1, ?)').run(
		'admin',
		hashPw('admin'),
		Date.now()
	);
	console.log('Usuario inicial creado → usuario: admin · contraseña: admin  (¡cámbiala!)');
} else {
	console.log('Seed omitido: ya hay usuarios.');
}

db.close();
