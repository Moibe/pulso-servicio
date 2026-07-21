import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

// Aplica un artifact de espejo-pull (espejo.db + espejo-uploads.tgz) sobre la BD
// y uploads LOCALES. Hace respaldo del local.db actual antes de sobrescribir, así
// que también es reversible. Uso:
//   node scripts/espejo-apply.mjs [carpeta-del-artifact]   (default ./espejo-prod)
//
// ⚠️ Detén tu `npm run dev` antes de correr esto: no se puede reemplazar el
// archivo SQLite mientras la app lo tiene abierto (queda en estado inconsistente).

const dir = process.argv[2] ?? './espejo-prod';
const localUrl = (process.env.DATABASE_URL ?? './local.db').replace(/^file:/, '');

const snapshot = path.join(dir, 'espejo.db');
const uploadsTgz = path.join(dir, 'espejo-uploads.tgz');

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

// 3) Reemplazar uploads/ (fotos). El tar contiene la carpeta "uploads/".
if (fs.existsSync(uploadsTgz) && fs.statSync(uploadsTgz).size > 0) {
	// ¿el tar trae algo?
	let hasEntries = false;
	try {
		const list = execFileSync('tar', ['-tzf', uploadsTgz], { encoding: 'utf8' }).trim();
		hasEntries = list.length > 0;
	} catch {}
	if (hasEntries) {
		fs.rmSync('./uploads', { recursive: true, force: true });
		execFileSync('tar', ['-xzf', uploadsTgz, '-C', '.']);
		console.log('Carpeta uploads/ reemplazada por la de prod.');
	} else {
		console.log('El tar de uploads venía vacío (prod no tiene fotos aún); no se tocó uploads/.');
	}
}

console.log('\nEspejo aplicado. Reinicia tu `npm run dev` para que tome la BD nueva.');
