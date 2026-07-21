-- Custom SQL migration file, put your code below! --
-- Introduce usuarios con login (username/password_hash/is_admin) + sesiones,
-- y quita el "dueño" de negocios en favor de negocio_members (visibilidad por
-- membresía, como los proyectos de shape_up). Probado en copia de local.db:
-- datos preservados, cascade delete e integridad de FKs limpios.

-- 1) negocios pierde usuario_id (participa en una FK -> requiere rebuild de tabla,
--    SQLite no permite DROP COLUMN directo sobre una columna de FK).
CREATE TABLE `negocios_new` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`descripcion` text,
	`creado_en` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `negocios_new` (`id`, `nombre`, `descripcion`, `creado_en`)
	SELECT `id`, `nombre`, `descripcion`, `creado_en` FROM `negocios`;
--> statement-breakpoint
DROP TABLE `negocios`;
--> statement-breakpoint
ALTER TABLE `negocios_new` RENAME TO `negocios`;
--> statement-breakpoint

-- 2) usuarios pasa de "email/nombre" a un usuario con login real. La fila sintética
--    'default' no es una cuenta real (nunca tuvo password) — se limpia; el script
--    db:seed crea el primer admin real.
DELETE FROM `usuarios`;
--> statement-breakpoint
DROP INDEX IF EXISTS `usuarios_email_unique`;
--> statement-breakpoint
ALTER TABLE `usuarios` DROP COLUMN `email`;
--> statement-breakpoint
ALTER TABLE `usuarios` DROP COLUMN `nombre`;
--> statement-breakpoint
ALTER TABLE `usuarios` ADD COLUMN `username` text NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE `usuarios` ADD COLUMN `password_hash` text NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE `usuarios` ADD COLUMN `is_admin` integer NOT NULL DEFAULT 0;
--> statement-breakpoint
CREATE UNIQUE INDEX `usuarios_username_unique` ON `usuarios` (`username`);
--> statement-breakpoint

-- 3) Sesiones (cookie -> token -> SHA-256 como PK; el token crudo nunca se guarda).
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`usuario_id` integer NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint

-- 4) Membresía: qué usuarios (no-admin) ven cada negocio.
CREATE TABLE `negocio_members` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`negocio_id` integer NOT NULL,
	`usuario_id` integer NOT NULL,
	FOREIGN KEY (`negocio_id`) REFERENCES `negocios`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `negocio_members_unique` ON `negocio_members` (`negocio_id`,`usuario_id`);
