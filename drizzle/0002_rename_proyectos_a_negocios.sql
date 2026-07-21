-- Custom SQL migration file, put your code below! --
-- Renombra proyectos → negocios. RENAME TO/COLUMN preserva los datos y SQLite
-- actualiza solo la FK de menus (probado: PRAGMA foreign_key_check limpio y el
-- cascade delete sigue funcionando tras el rename).
ALTER TABLE `proyectos` RENAME TO `negocios`;
--> statement-breakpoint
ALTER TABLE `menus` RENAME COLUMN `proyecto_id` TO `negocio_id`;
--> statement-breakpoint
DROP INDEX IF EXISTS `proyectos_usuario_idx`;
--> statement-breakpoint
CREATE INDEX `negocios_usuario_idx` ON `negocios` (`usuario_id`);
--> statement-breakpoint
DROP INDEX IF EXISTS `menus_proyecto_idx`;
--> statement-breakpoint
CREATE INDEX `menus_negocio_idx` ON `menus` (`negocio_id`);
