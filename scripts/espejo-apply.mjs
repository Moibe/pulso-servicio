import fs from 'node:fs';
import path from 'node:path';

// Aplica un artifact de espejo-pull (espejo.db) sobre la BD LOCAL. Hace respaldo
// del local.db actual antes de sobrescribir, así que también es reversible. Uso:
//   node scripts/espejo-apply.mjs [carpeta-del-artifact]   (default ./espejo-prod)
//
// ⚠️ Detén tu `npm run dev` antes de correr esto: no se puede reemplazar el
// archivo SQLite mientras la app lo tiene abierto (queda en estado inconsistente).

const dir = process.argv[2] ?? './espejo-prod';
const localUrl = (process.env.DATABASE_URL ?? './local.db').replace(/^file:/, '');

const snapshot = path.join(dir, 'espejo.db');

if (!fs.existsSync(snapshot)) {
	console.error(`No encuentro ${snapshot}. ¿Bajaste el artifact "espejo-prod" a esa carpeta?`);
	process.exit(1);
}

// Marca de tiempo para el respaldo (segura fuera de Workflow scripts).
const stamp = new Date().toISOString().replace(/[:.]/g, '-');

// 1) Respaldo del local.db actual (si existe) antes de pisarlo.
if (fs.existsSync(localUrl)) {
	const bak = `${localUrl}.bak-${stamp}`;
	fs.copyFileSync(localUrl, bak);
	console.log(`Respaldo de tu local anterior → ${bak}`);
}

// 2) Reemplazar local.db por el snapshot de prod, limpiando WAL/SHM viejos.
for (const ext of ['-wal', '-shm']) {
	try { fs.unlinkSync(localUrl + ext); } catch {}
}
fs.copyFileSync(snapshot, localUrl);
console.log(`BD local reemplazada por el snapshot de prod (${localUrl}).`);

console.log('\nEspejo aplicado. Reinicia tu `npm run dev` para que tome la BD nueva.');
