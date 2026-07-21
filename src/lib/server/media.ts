// Almacenamiento de imágenes. HOY: local en disco, servido por la ruta
// /uploads/[...path]. FUTURO: swap a un CDN (fal.media / DO Spaces) — como la
// DB solo guarda la URL string, migrar es cambiar lo que devuelve saveImage()
// sin tocar el schema (misma idea que el fal-upload-helper de estudio-cine).
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

// Raíz de los archivos subidos. En dev = ./uploads (junto al proyecto, en
// .gitignore). En el droplet: mismo ./uploads (persiste entre `git pull`) o
// un absoluto vía UPLOADS_DIR (p.ej. /var/lib/menu/uploads).
export const MEDIA_ROOT = process.env.UPLOADS_DIR
	? path.resolve(process.env.UPLOADS_DIR)
	: path.resolve('uploads');

export const MAX_BYTES = 10 * 1024 * 1024; // 10 MB (nginx permite 12M)

const EXT_BY_MIME: Record<string, string> = {
	'image/jpeg': '.jpg',
	'image/png': '.png',
	'image/webp': '.webp',
	'image/gif': '.gif',
	'image/avif': '.avif'
};

export class MediaError extends Error {
	status: number;
	constructor(status: number, message: string) {
		super(message);
		this.status = status;
	}
}

/**
 * Guarda un archivo de imagen bajo MEDIA_ROOT/<subdir>/ con nombre aleatorio y
 * devuelve la URL pública que sirve la app: `/uploads/<subdir>/<archivo>`.
 */
export async function saveImage(file: File, subdir: string): Promise<string> {
	if (!(file instanceof File) || file.size === 0) {
		throw new MediaError(400, 'Archivo vacío o inválido');
	}
	if (file.size > MAX_BYTES) {
		throw new MediaError(413, `Imagen muy grande (máx ${MAX_BYTES / 1024 / 1024} MB)`);
	}
	const ext = EXT_BY_MIME[file.type] ?? path.extname(file.name).toLowerCase();
	if (!ext || !Object.values(EXT_BY_MIME).includes(ext)) {
		throw new MediaError(415, 'Formato no soportado (usa JPG, PNG, WebP, GIF o AVIF)');
	}

	const filename = `${randomUUID()}${ext}`;
	const dir = path.join(MEDIA_ROOT, subdir);
	await mkdir(dir, { recursive: true });
	const buf = Buffer.from(await file.arrayBuffer());
	await writeFile(path.join(dir, filename), buf);

	return `/uploads/${subdir}/${filename}`;
}

/**
 * Resuelve una ruta relativa (la parte después de /uploads/) a un path absoluto
 * dentro de MEDIA_ROOT, bloqueando path traversal. Lo usa la ruta que sirve.
 */
export function resolveMediaPath(relPath: string): string {
	const clean = relPath.replace(/^\/+/, '');
	const abs = path.resolve(MEDIA_ROOT, clean);
	if (abs !== MEDIA_ROOT && !abs.startsWith(MEDIA_ROOT + path.sep)) {
		throw new MediaError(403, 'Ruta fuera del directorio permitido');
	}
	return abs;
}
