-- Custom SQL migration file, put your code below! --
-- Personal de las farmacias. OJO: supervisores y empleados NO son `usuarios`
-- (cuentas con login) — son registros de plantilla. farmacia_members se queda
-- como está, sigue siendo quién ACCEDE a la app.
--
--   supervisor 1 ──< N farmacias   (la FK vive en farmacias.supervisor_id)
--   farmacia   1 ──< N empleados   (la FK vive en empleados.farmacia_id)
--
-- Ambas FK son ON DELETE SET NULL, no cascade: borrar un supervisor deja a sus
-- farmacias sin supervisor, y borrar una farmacia deja a sus empleados "sin
-- asignar". Son personas: no deben desaparecer con la entidad que las agrupa.
CREATE TABLE `supervisores` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`creado_en` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `empleados` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`farmacia_id` integer,
	`creado_en` integer NOT NULL,
	FOREIGN KEY (`farmacia_id`) REFERENCES `farmacias`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `empleados_farmacia_idx` ON `empleados` (`farmacia_id`);
--> statement-breakpoint
-- SQLite solo admite ADD COLUMN con REFERENCES si la columna es nullable y su
-- default es NULL (que es el caso: el supervisor se asigna después de crear la
-- farmacia). Así se evita tener que reconstruir la tabla entera.
ALTER TABLE `farmacias` ADD `supervisor_id` integer REFERENCES `supervisores`(`id`) ON DELETE set null;
--> statement-breakpoint
CREATE INDEX `farmacias_supervisor_idx` ON `farmacias` (`supervisor_id`);
