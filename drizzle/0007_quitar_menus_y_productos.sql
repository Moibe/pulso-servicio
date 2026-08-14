-- Custom SQL migration file, put your code below! --
-- Se retira el catálogo heredado del proyecto `menu` (farmacia ──< menú ──< producto).
-- La app queda enfocada en farmacias + su personal (supervisor y empleados).
--
-- ⚠️ DESTRUCTIVO E IRREVERSIBLE: borra los datos de menús, productos y sus fotos.
-- Autorizado explícitamente por el usuario. Antes de desplegarlo se dejó un
-- snapshot de la BD de producción vía el workflow "espejo pull".
--
-- Orden: de hija a madre (producto_fotos → productos → menus). Con
-- foreign_keys=OFF (como corre scripts/migrate.mjs) el orden no es obligatorio,
-- pero así la migración también es correcta con las FK activas.
--
-- Las FOTOS en disco (uploads/productos/*) no las toca SQL: quedan huérfanas en
-- el droplet y se pueden borrar a mano con `rm -rf ~/code/pulso-servicio/uploads`.
DROP TABLE IF EXISTS `producto_fotos`;
--> statement-breakpoint
DROP TABLE IF EXISTS `productos`;
--> statement-breakpoint
DROP TABLE IF EXISTS `menus`;
