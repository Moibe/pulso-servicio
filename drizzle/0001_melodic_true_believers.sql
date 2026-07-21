CREATE TABLE `producto_fotos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`producto_id` integer NOT NULL,
	`url` text NOT NULL,
	`orden` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`producto_id`) REFERENCES `productos`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `producto_fotos_producto_idx` ON `producto_fotos` (`producto_id`);--> statement-breakpoint
ALTER TABLE `productos` ADD `foto_principal` text;