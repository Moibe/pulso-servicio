import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

const url = process.env.DATABASE_URL ?? './local.db';
const sqlite = new Database(url);

// IMPORTANTE: better-sqlite3 abre con foreign_keys=ON por default. Drizzle envuelve
// TODA la migración en un solo BEGIN/COMMIT, y SQLite ignora cambios al pragma
// foreign_keys hecho DENTRO de una transacción — así que hay que apagarlo aquí,
// ANTES de que migrate() abra su transacción. Sin esto, un DROP TABLE sobre una
// tabla padre (p. ej. al reconstruirla para quitar/agregar una columna con FK)
// dispara el ON DELETE CASCADE y borra en cascada a sus hijos ANTES de recrearla
// (nos pasó una vez: se perdieron menus/productos al reconstruir negocios).
sqlite.pragma('foreign_keys = OFF');

const db = drizzle(sqlite);
migrate(db, { migrationsFolder: './drizzle' });

const violations = sqlite.pragma('foreign_key_check');
sqlite.pragma('foreign_keys = ON');
sqlite.close();

if (violations.length > 0) {
	console.error('foreign_key_check encontró violaciones tras migrar:', violations);
	process.exit(1);
}
console.log(`Migrations applied to ${url}`);
