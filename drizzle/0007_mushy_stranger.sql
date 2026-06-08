CREATE TABLE `factory_order_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`factoryOrderId` int NOT NULL,
	`itemNumber` int NOT NULL DEFAULT 1,
	`itemData` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `factory_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`quoteId` int NOT NULL,
	`revision` int NOT NULL DEFAULT 1,
	`empresa` enum('ALFALUX','LUMINEW') NOT NULL DEFAULT 'ALFALUX',
	`status` enum('draft','sent','in_production','completed') NOT NULL DEFAULT 'draft',
	`deliveryDays` int DEFAULT 19,
	`approvedAt` timestamp,
	`notes` text,
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE INDEX `factory_order_items_orderId_idx` ON `factory_order_items` (`factoryOrderId`);--> statement-breakpoint
CREATE INDEX `factory_orders_quoteId_idx` ON `factory_orders` (`quoteId`);