import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import readline from 'node:readline';

// Un comando: dispara el workflow espejo-pull, espera a que termine, baja el
// artifact y lo aplica sobre tu local (con respaldo). Requiere `gh` autenticado.
// Uso: npm run db:espejo-pull

const WORKFLOW = 'espejo-pull.yml';
const OUT_DIR = './espejo-prod';

function ask(q) {
	return new Promise((res) => {
		const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
		rl.question(q, (a) => {
			rl.close();
			res(a.trim());
		});
	});
}

// IMPORTANTE: no se puede intercambiar el archivo SQLite mientras `npm run dev`
// lo tiene abierto (deja la BD en un estado inconsistente). Confirmar que está
// detenido antes de sobrescribir el local.
const ok = await ask('¿Detuviste tu `npm run dev`? El espejo va a reemplazar tu local.db. (s/N) ');
if (!/^s/i.test(ok)) {
	console.log('Cancelado. Detén el dev server y vuelve a correrlo.');
	process.exit(0);
}

function gh(args, opts = {}) {
	return execFileSync('gh', args, { encoding: 'utf8', ...opts });
}
function sleep(ms) {
	Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}
function latestRunId() {
	try {
		const out = gh(['run', 'list', '--workflow', WORKFLOW, '-L', '1', '--json', 'databaseId']);
		const arr = JSON.parse(out);
		return arr[0]?.databaseId ?? null;
	} catch {
		return null;
	}
}

// 0) gh disponible?
try {
	gh(['--version']);
} catch {
	console.error('Necesitas la CLI de GitHub (`gh`) autenticada. Instálala y corre `gh auth login`.');
	process.exit(1);
}

const before = latestRunId();
console.log('Disparando el workflow espejo-pull en prod (solo lectura)…');
gh(['workflow', 'run', WORKFLOW, '--ref', 'main'], { stdio: 'inherit' });

// 1) Esperar a que aparezca el run NUEVO (distinto al anterior).
let runId = null;
for (let i = 0; i < 20 && !runId; i++) {
	sleep(1500);
	const id = latestRunId();
	if (id && id !== before) runId = id;
}
if (!runId) {
	console.error('No pude detectar el run nuevo. Revisa la pestaña Actions y usa `gh run download` a mano.');
	process.exit(1);
}
console.log(`Run #${runId} en curso. Esperando a que termine…`);

// 2) Bloquear hasta que termine (falla con exit≠0 si el run falló).
try {
	gh(['run', 'watch', String(runId), '--exit-status'], { stdio: 'inherit' });
} catch {
	console.error(`El run #${runId} falló. Revisa sus logs con: gh run view ${runId} --log`);
	process.exit(1);
}

// 3) Bajar el artifact (carpeta limpia).
fs.rmSync(OUT_DIR, { recursive: true, force: true });
gh(['run', 'download', String(runId), '-n', 'espejo-prod', '-D', OUT_DIR], { stdio: 'inherit' });

// 4) Aplicar sobre local (respaldando el local anterior).
execFileSync(process.execPath, ['scripts/espejo-apply.mjs', OUT_DIR], { stdio: 'inherit' });

// 5) Limpiar la descarga.
fs.rmSync(OUT_DIR, { recursive: true, force: true });
console.log('\nEspejo prod → local completo.');
