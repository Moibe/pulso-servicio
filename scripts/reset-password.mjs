import Database from 'better-sqlite3';
import { randomBytes, scryptSync } from 'node:crypto';

// Rescate de emergencia: resetea la contraseña de un usuario existente sin pasar
// por la app (útil si el único admin se queda sin poder entrar). Mismo formato
// scrypt "salt:hash" que src/lib/server/auth.ts.
//
// Uso:  npm run db:reset-password -- <usuario> <contraseña-nueva>

const [username, password] = process.argv.slice(2);

if (!username || !password) {
	console.error('Uso: npm run db:reset-password -- <usuario> <contraseña-nueva>');
	process.exit(1);
}
if (password.length < 4) {
	console.error('La contraseña debe tener al menos 4 caracteres.');
	process.exit(1);
}

const url = process.env.DATABASE_URL ?? './local.db';
const db = new Database(url);

const user = db.prepare('SELECT id FROM usuarios WHERE username = ?').get(username);
if (!user) {
	console.error(`No existe el usuario "${username}".`);
	db.close();
	process.exit(1);
}

const salt = randomBytes(16);
const passwordHash = `${salt.toString('hex')}:${scryptSync(password, salt, 64).toString('hex')}`;
db.prepare('UPDATE usuarios SET password_hash = ? WHERE id = ?').run(passwordHash, user.id);

console.log(`Contraseña de "${username}" actualizada.`);
db.close();
