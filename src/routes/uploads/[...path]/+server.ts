// Sirve los archivos subidos desde MEDIA_ROOT. Reemplaza a static/uploads para
// que funcione también en producción (adapter-node no sirve lo subido en runtime).
import { error } from '@sveltejs/kit';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { resolveMediaPath, MediaError } from '$lib/server/media';
import type { RequestHandler } from './$types';

const MIME_BY_EXT: Record<string, string> = {
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.png': 'image/png',
	'.webp': 'image/webp',
	'.gif': 'image/gif',
	'.avif': 'image/avif'
};

export const GET: RequestHandler = async ({ params }) => {
	let abs: string;
	try {
		abs = resolveMediaPath(params.path);
	} catch (e) {
		if (e instanceof MediaError) error(e.status, e.message);
		throw e;
	}

	try {
		const stats = await stat(abs);
		if (!stats.isFile()) error(404, 'No encontrado');
		const buf = await readFile(abs);
		const mime = MIME_BY_EXT[path.extname(abs).toLowerCase()] ?? 'application/octet-stream';
		return new Response(new Uint8Array(buf), {
			headers: {
				'content-type': mime,
				'cache-control': 'public, max-age=31536000, immutable'
			}
		});
	} catch (e) {
		if (e && typeof e === 'object' && 'status' in e) throw e;
		error(404, 'No encontrado');
	}
};
