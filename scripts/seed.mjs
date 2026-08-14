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
	// OJO: creado_en es `mode: 'timestamp'` en el schema, o sea SEGUNDOS unix.
	// Aquí se inserta con SQL crudo, así que no hay conversión de drizzle que
	// valga: pasar Date.now() (milisegundos) guardaba fechas del año 58521.
	db.prepare('INSERT INTO usuarios (username, password_hash, is_admin, creado_en) VALUES (?, ?, 1, ?)').run(
		'admin',
		hashPw('admin'),
		Math.floor(Date.now() / 1000)
	);
	console.log('Usuario inicial creado → usuario: admin · contraseña: admin  (¡cámbiala!)');
} else {
	console.log('Seed omitido: ya hay usuarios.');
}

db.close();
