ALTER TABLE `factory_order_excels` MODIFY COLUMN `orderNumber` varchar(20) NOT NULL;--> statement-breakpoint
ALTER TABLE `factory_orders` MODIFY COLUMN `orderNumber` varchar(20);--> statement-breakpoint
ALTER TABLE `factory_orders` ADD `parentOrderId` int;--> statement-breakpoint
ALTER TABLE `factory_orders` ADD `subOrderIndex` int;--> statement-breakpoint
CREATE INDEX `factory_orders_parentId_idx` ON `factory_orders` (`parentOrderId`);