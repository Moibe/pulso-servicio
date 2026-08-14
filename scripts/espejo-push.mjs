import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import Database from 'better-sqlite3';

// ⚠️ PELIGROSO: sube tu BD LOCAL a PRODUCCIÓN, sobrescribiéndola. Antes de pisar
// nada, hace respaldo en el droplet (backups/prod-<ts>.db) para poder revertir.
// Requiere la bandera --confirmar y acceso SSH al droplet.
//
// Uso:  npm run db:espejo-push -- --confirmar

const HOST = process.env.ESPEJO_SSH || 'root@165.22.53.200';
// Ruta relativa al home del usuario remoto (root → /root/code/pulso-servicio). Sirve igual
// para `cd` en ssh como para el destino de scp, sin depender de expandir `~`.
const DIR = 'code/pulso-servicio';
const localUrl = (process.env.DATABASE_URL ?? './local.db').replace(/^file:/, '');

if (!process.argv.includes('--confirmar')) {
	console.error(
		[
			'⚠️  Esto SOBRESCRIBE la base de datos de PRODUCCIÓN con tu copia local.',
			'    (Se hace respaldo de prod antes, pero aun así confírmalo a propósito.)',
			'',
			`    Destino: ${HOST}:${DIR}`,
			'    Para proceder:  npm run db:espejo-push -- --confirmar'
		].join('\n')
	);
	process.exit(1);
}

if (!fs.existsSync(localUrl)) {
	console.error(`No existe tu BD local (${localUrl}). Nada que subir.`);
	process.exit(1);
}

const ssh = (remoteCmd) => execFileSync('ssh', [HOST, remoteCmd], { stdio: 'inherit' });
const scp = (from, to) => execFileSync('scp', [from, to], { stdio: 'inherit' });

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const tmpDb = path.join(os.tmpdir(), `espejo-local-${stamp}.db`);

// 1) Snapshot consistente de tu BD local (VACUUM INTO, aunque el dev esté corriendo).
try { fs.unlinkSync(tmpDb); } catch {}
const db = new Database(localUrl);
db.exec(`VACUUM INTO '${tmpDb.replace(/\\/g, '/')}'`);
db.close();
console.log('Snapshot local listo.');

// 2) Respaldo de PROD antes de pisar — reversible.
console.log('Respaldando prod antes de sobrescribir…');
ssh(
	`cd ${DIR} && mkdir -p backups && ` +
		`{ [ -f local.db ] && cp local.db backups/prod-${stamp}.db && echo 'db respaldada'; } || echo 'prod no tenía db'`
);

// 3) Subir la BD y reemplazar (limpiando WAL/SHM viejos de prod).
scp(tmpDb, `${HOST}:${DIR}/local.db`);
ssh(`cd ${DIR} && rm -f local.db-wal local.db-shm`);
console.log('BD de prod reemplazada.');

// 4) Reiniciar pm2 para que la app reabra la BD nueva.
ssh(`export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use node >/dev/null && pm2 restart pulso-servicio`);

// 5) Limpieza local.
try { fs.unlinkSync(tmpDb); } catch {}

console.log(
	`\nEspejo local → prod completo. Respaldo en el droplet: ${DIR}/backups/prod-${stamp}.db. ` +
		`Para revertir: copia ese .db de vuelta a ${DIR}/local.db y pm2 restart pulso-servicio.`
);
