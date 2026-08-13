import { sqliteTable, integer, text, real, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// Jerarquía del dominio (uno-a-muchos en cascada):
//   farmacia ──< menú ──< producto
// Borrar un padre arrastra a todos sus hijos (onDelete: 'cascade').
//
// Auth (basado en el patrón de shape_up): usuarios con sesión. Una farmacia no tiene
// dueño en su propia columna — su visibilidad y quién la administra vive en
// farmacia_members. Los admins ven/editan todo. Los demás usuarios pueden crear su
// propia farmacia (nacen como "owner" en farmacia_members) y administrarla por
// completo; en farmacias donde solo son "member" son de solo lectura.

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
	// Los admins gestionan usuarios y farmacias; los demás son de solo lectura.
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

// ── Personal (NO entra al sistema) ────────────────────────────────────────────
// Ojo con la distinción: `usuarios` son cuentas que hacen login; supervisores y
// empleados son registros de plantilla, gente que no entra a la app. Por eso son
// tablas aparte y no roles de farmacia_members. Hoy solo existen como catálogo:
// quien los da de alta y los mueve es el admin.

// Un supervisor supervisa VARIAS farmacias (la FK vive en farmacias).
export const supervisores = sqliteTable('supervisores', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	nombre: text('nombre').notNull(),
	creadoEn: creadoEn()
});

// 1 farmacia tiene varios menús. Sin dueño: la visibilidad la da farmacia_members.
export const farmacias = sqliteTable(
	'farmacias',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		nombre: text('nombre').notNull(),
		descripcion: text('descripcion'),
		// 1 supervisor por farmacia, opcional: se asigna después de crearla.
		// set null (no cascade): borrar al supervisor deja la farmacia sin
		// supervisor, no borra la farmacia.
		supervisorId: integer('supervisor_id').references(() => supervisores.id, {
			onDelete: 'set null'
		}),
		creadoEn: creadoEn()
	},
	(t) => [index('farmacias_supervisor_idx').on(t.supervisorId)]
);

// Un empleado pertenece a UNA farmacia a la vez; moverlo = cambiar farmaciaId.
// Nullable + set null a propósito: si se borra la farmacia, el empleado queda
// "sin asignar" en vez de desaparecer (es una persona, no un dato de la farmacia).
export const empleados = sqliteTable(
	'empleados',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		nombre: text('nombre').notNull(),
		farmaciaId: integer('farmacia_id').references(() => farmacias.id, { onDelete: 'set null' }),
		creadoEn: creadoEn()
	},
	(t) => [index('empleados_farmacia_idx').on(t.farmaciaId)]
);

// Qué usuarios (no-admin) pueden ver cada farmacia. Los admins ven todas sin importar esto.
// rol: 'owner' (quien lo creó; puede gestionarlo por completo) | 'member' (solo lectura).
export const farmaciaMembers = sqliteTable(
	'farmacia_members',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		farmaciaId: integer('farmacia_id')
			.notNull()
			.references(() => farmacias.id, { onDelete: 'cascade' }),
		usuarioId: integer('usuario_id')
			.notNull()
			.references(() => usuarios.id, { onDelete: 'cascade' }),
		rol: text('rol').notNull().default('member')
	},
	(t) => [uniqueIndex('farmacia_members_unique').on(t.farmaciaId, t.usuarioId)]
);

// 1 menú pertenece a una farmacia y tiene varios productos.
export const menus = sqliteTable(
	'menus',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		farmaciaId: integer('farmacia_id')
			.notNull()
			.references(() => farmacias.id, { onDelete: 'cascade' }),
		nombre: text('nombre').notNull(),
		// Para ordenar los menús dentro de la farmacia.
		orden: integer('orden').notNull().default(0),
		activo: integer('activo', { mode: 'boolean' }).notNull().default(true),
		creadoEn: creadoEn()
	},
	(t) => [index('menus_farmacia_idx').on(t.farmaciaId)]
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
	farmaciaMembers: many(farmaciaMembers)
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
	usuario: one(usuarios, { fields: [sessions.usuarioId], references: [usuarios.id] })
}));

export const supervisoresRelations = relations(supervisores, ({ many }) => ({
	farmacias: many(farmacias)
}));

export const farmaciasRelations = relations(farmacias, ({ one, many }) => ({
	menus: many(menus),
	members: many(farmaciaMembers),
	supervisor: one(supervisores, {
		fields: [farmacias.supervisorId],
		references: [supervisores.id]
	}),
	empleados: many(empleados)
}));

export const empleadosRelations = relations(empleados, ({ one }) => ({
	farmacia: one(farmacias, { fields: [empleados.farmaciaId], references: [farmacias.id] })
}));

export const farmaciaMembersRelations = relations(farmaciaMembers, ({ one }) => ({
	farmacia: one(farmacias, { fields: [farmaciaMembers.farmaciaId], references: [farmacias.id] }),
	usuario: one(usuarios, { fields: [farmaciaMembers.usuarioId], references: [usuarios.id] })
}));

export const menusRelations = relations(menus, ({ one, many }) => ({
	farmacia: one(farmacias, { fields: [menus.farmaciaId], references: [farmacias.id] }),
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
export type Farmacia = typeof farmacias.$inferSelect;
export type FarmaciaMember = typeof farmaciaMembers.$inferSelect;
export type Supervisor = typeof supervisores.$inferSelect;
export type Empleado = typeof empleados.$inferSelect;
export type Menu = typeof menus.$inferSelect;
export type Producto = typeof productos.$inferSelect;
export type ProductoFoto = typeof productoFotos.$inferSelect;
