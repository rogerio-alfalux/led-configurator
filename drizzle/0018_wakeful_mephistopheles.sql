CREATE TABLE `factory_order_excels` (
	`id` int AUTO_INCREMENT NOT NULL,
	`factoryOrderId` int NOT NULL,
	`orderNumber` varchar(6) NOT NULL,
	`revision` int NOT NULL,
	`excelKey` text NOT NULL,
	`excelUrl` text NOT NULL,
	`generatedByUserId` int,
	`generatedAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
ALTER TABLE `factory_orders` MODIFY COLUMN `orderNumber` varchar(6);--> statement-breakpoint
CREATE INDEX `factory_order_excels_orderId_idx` ON `factory_order_excels` (`factoryOrderId`);