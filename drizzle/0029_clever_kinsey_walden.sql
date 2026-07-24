CREATE TABLE `sample_links` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sampleOrderId` int NOT NULL,
	`linkedQuoteId` int NOT NULL,
	`linkType` varchar(32) NOT NULL DEFAULT 'associar',
	`notes` text,
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `sample_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`quoteId` int NOT NULL,
	`clientName` varchar(256) NOT NULL,
	`projectName` varchar(256),
	`costAmount` decimal(12,2) NOT NULL,
	`status` varchar(32) NOT NULL DEFAULT 'active',
	`notes` text,
	`sellerName` varchar(256),
	`sellerId` int,
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
ALTER TABLE `quotes` MODIFY COLUMN `status` enum('open','approved','lost','cancelled','invoiced','sample') NOT NULL DEFAULT 'open';--> statement-breakpoint
ALTER TABLE `quotes` ADD `showDiscount` boolean DEFAULT false;--> statement-breakpoint
CREATE INDEX `sample_links_sampleOrderId_idx` ON `sample_links` (`sampleOrderId`);--> statement-breakpoint
CREATE INDEX `sample_links_linkedQuoteId_idx` ON `sample_links` (`linkedQuoteId`);--> statement-breakpoint
CREATE INDEX `sample_orders_quoteId_idx` ON `sample_orders` (`quoteId`);--> statement-breakpoint
CREATE INDEX `sample_orders_clientName_idx` ON `sample_orders` (`clientName`);--> statement-breakpoint
CREATE INDEX `sample_orders_status_idx` ON `sample_orders` (`status`);