import { sqliteTable, integer, text, real, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// Jerarquía del dominio (uno-a-muchos en cascada):
//   negocio ──< menú ──< producto
// Borrar un padre arrastra a todos sus hijos (onDelete: 'cascade').
//
// Auth (basado en el patrón de shape_up): usuarios con sesión. Un negocio no tiene
// dueño en su propia columna — su visibilidad y quién lo administra vive en
// negocio_members. Los admins ven/editan todo. Los demás usuarios pueden crear su
// propio negocio (nacen como "owner" de ese negocio_members) y administrarlo por
// completo; en negocios donde solo son "member" son de solo lectura.

// Helper: timestamp de creación por defecto = ahora.
const creadoEn = () =>
	integer('creado_en', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date());

// La persona que entra al sistema. Sesión basada en cookie (ver $lib/server/auth.ts).
export const usuarios = sqliteTable('usuarios', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	username: text('username').notNull().unique(),
	// scrypt hash almacenado como "saltHex:hashHex".
	passwordHash: text('password_hash').notNull(),
	// Los admins gestionan usuarios y negocios; los demás son de solo lectura.
	isAdmin: integer('is_admin', { mode: 'boolean' }).notNull().default(false),
	creadoEn: creadoEn()
});

export const sessions = sqliteTable('sessions', {
	// SHA-256 del token de sesión (el token crudo vive solo en la cookie).
	id: text('id').primaryKey(),
	usuarioId: integer('usuario_id')
		.notNull()
		.references(() => usuarios.id, { onDelete: 'cascade' }),
	expiresAt: integer('expires_at').notNull() // unix ms
});

// 1 negocio tiene varios menús. Sin dueño: la visibilidad la da negocio_members.
export const negocios = sqliteTable('negocios', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	nombre: text('nombre').notNull(),
	descripcion: text('descripcion'),
	creadoEn: creadoEn()
});

// Qué usuarios (no-admin) pueden ver cada negocio. Los admins ven todos sin importar esto.
// rol: 'owner' (quien lo creó; puede gestionarlo por completo) | 'member' (solo lectura).
export const negocioMembers = sqliteTable(
	'negocio_members',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		negocioId: integer('negocio_id')
			.notNull()
			.references(() => negocios.id, { onDelete: 'cascade' }),
		usuarioId: integer('usuario_id')
			.notNull()
			.references(() => usuarios.id, { onDelete: 'cascade' }),
		rol: text('rol').notNull().default('member')
	},
	(t) => [uniqueIndex('negocio_members_unique').on(t.negocioId, t.usuarioId)]
);

// 1 menú pertenece a un negocio y tiene varios productos.
export const menus = sqliteTable(
	'menus',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		negocioId: integer('negocio_id')
			.notNull()
			.references(() => negocios.id, { onDelete: 'cascade' }),
		nombre: text('nombre').notNull(),
		// Para ordenar los menús dentro del negocio.
		orden: integer('orden').notNull().default(0),
		activo: integer('activo', { mode: 'boolean' }).notNull().default(true),
		creadoEn: creadoEn()
	},
	(t) => [index('menus_negocio_idx').on(t.negocioId)]
);

// 1 producto pertenece a un menú.
export const productos = sqliteTable(
	'productos',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		menuId: integer('menu_id')
			.notNull()
			.references(() => menus.id, { onDelete: 'cascade' }),
		nombre: text('nombre').notNull(),
		descripcion: text('descripcion'),
		precio: real('precio'),
		// Foto principal: URL/ruta. Local hoy (/uploads/…), CDN a futuro (mismo campo).
		fotoPrincipal: text('foto_principal'),
		// Para ordenar los productos dentro del menú.
		orden: integer('orden').notNull().default(0),
		disponible: integer('disponible', { mode: 'boolean' }).notNull().default(true),
		creadoEn: creadoEn()
	},
	(t) => [index('productos_menu_idx').on(t.menuId)]
);

// Fotos adicionales de un producto (además de la principal). Cada una es una
// URL/ruta igual que fotoPrincipal (local hoy, CDN a futuro).
export const productoFotos = sqliteTable(
	'producto_fotos',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		productoId: integer('producto_id')
			.notNull()
			.references(() => productos.id, { onDelete: 'cascade' }),
		url: text('url').notNull(),
		orden: integer('orden').notNull().default(0)
	},
	(t) => [index('producto_fotos_producto_idx').on(t.productoId)]
);

// Relaciones para la API de consultas de drizzle (db.query.*.findMany({ with: {...} })).
export const usuariosRelations = relations(usuarios, ({ many }) => ({
	sessions: many(sessions),
	negocioMembers: many(negocioMembers)
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
	usuario: one(usuarios, { fields: [sessions.usuarioId], references: [usuarios.id] })
}));

export const negociosRelations = relations(negocios, ({ many }) => ({
	menus: many(menus),
	members: many(negocioMembers)
}));

export const negocioMembersRelations = relations(negocioMembers, ({ one }) => ({
	negocio: one(negocios, { fields: [negocioMembers.negocioId], references: [negocios.id] }),
	usuario: one(usuarios, { fields: [negocioMembers.usuarioId], references: [usuarios.id] })
}));

export const menusRelations = relations(menus, ({ one, many }) => ({
	negocio: one(negocios, { fields: [menus.negocioId], references: [negocios.id] }),
	productos: many(productos)
}));

export const productosRelations = relations(productos, ({ one, many }) => ({
	menu: one(menus, { fields: [productos.menuId], references: [menus.id] }),
	fotos: many(productoFotos)
}));

export const productoFotosRelations = relations(productoFotos, ({ one }) => ({
	producto: one(productos, { fields: [productoFotos.productoId], references: [productos.id] })
}));

// Tipos inferidos — úsalos en load functions y actions en vez de re-tipar a mano.
export type Usuario = typeof usuarios.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Negocio = typeof negocios.$inferSelect;
export type NegocioMember = typeof negocioMembers.$inferSelect;
export type Menu = typeof menus.$inferSelect;
export type Producto = typeof productos.$inferSelect;
export type ProductoFoto = typeof productoFotos.$inferSelect;
