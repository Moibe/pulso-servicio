-- Custom SQL migration file, put your code below! --
-- Renombra negocios → farmacias (el dominio pasó a ser farmacias).
--
-- RENAME TO / RENAME COLUMN preservan los datos, y SQLite reescribe solo las
-- cláusulas REFERENCES de las tablas hijas (menus, farmacia_members) para que
-- apunten a `farmacias`. Ojo: la doc de SQLite advierte que eso último solo pasa
-- con foreign_keys activas, y scripts/migrate.mjs corre con foreign_keys=OFF a
-- propósito. Se probó sobre una copia de local.db CON datos replicando ese modo:
-- las FK quedaron apuntando a "farmacias", PRAGMA foreign_key_check limpio, el
-- join farmacia→menú→producto intacto y el cascade delete sigue funcionando.
ALTER TABLE `negocios` RENAME TO `farmacias`;
--> statement-breakpoint
ALTER TABLE `negocio_members` RENAME TO `farmacia_members`;
--> statement-breakpoint
ALTER TABLE `farmacia_members` RENAME COLUMN `negocio_id` TO `farmacia_id`;
--> statement-breakpoint
ALTER TABLE `menus` RENAME COLUMN `negocio_id` TO `farmacia_id`;
--> statement-breakpoint
DROP INDEX IF EXISTS `negocio_members_unique`;
--> statement-breakpoint
CREATE UNIQUE INDEX `farmacia_members_unique` ON `farmacia_members` (`farmacia_id`,`usuario_id`);
--> statement-breakpoint
DROP INDEX IF EXISTS `menus_negocio_idx`;
--> statement-breakpoint
CREATE INDEX `menus_farmacia_idx` ON `menus` (`farmacia_id`);
