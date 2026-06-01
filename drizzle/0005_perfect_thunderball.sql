ALTER TABLE `quotes` DROP INDEX `quotes_quoteNumber_unique`;--> statement-breakpoint
ALTER TABLE `sellers` DROP INDEX `sellers_code_unique`;--> statement-breakpoint
ALTER TABLE `users` DROP INDEX `users_openId_unique`;--> statement-breakpoint
ALTER TABLE `assistants` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `audit_logs` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `cart_items` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `quote_items` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `quote_versions` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `quotes` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `sellers` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `users` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `assistants` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `audit_logs` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `cart_items` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `quote_items` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `quote_versions` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `quotes` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `sellers` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `lastSignedIn` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `quotes` ADD `revisionCount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `quotes_quoteNumber_unique` ON `quotes` (`quoteNumber`);--> statement-breakpoint
CREATE INDEX `sellers_code_unique` ON `sellers` (`code`);--> statement-breakpoint
CREATE INDEX `users_openId_unique` ON `users` (`openId`);