CREATE TABLE `api_keys` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`keyHash` varchar(64) NOT NULL,
	`keyPrefix` varchar(8) NOT NULL,
	`createdByUserId` int NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`lastUsedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
ALTER TABLE `quotes` ADD `deliveryDays` int DEFAULT 20 NOT NULL;--> statement-breakpoint
ALTER TABLE `quotes` ADD `commissionPercent` decimal(5,4) DEFAULT '0.05' NOT NULL;--> statement-breakpoint
ALTER TABLE `quotes` ADD `paymentTerm` varchar(256) DEFAULT '30% Sinal e 70% a 28DDF (mediante aprovação de cadastro)';--> statement-breakpoint
ALTER TABLE `quotes` ADD `destState` varchar(2);--> statement-breakpoint
ALTER TABLE `quotes` ADD `difalEnabled` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `quotes` ADD `difalPercent` decimal(5,2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `quotes` ADD `fcpPercent` decimal(5,2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `quotes` ADD `fcpEnabled` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `quotes` ADD `difalValue` decimal(12,2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `quotes` ADD `fcpValue` decimal(12,2) DEFAULT '0';--> statement-breakpoint
CREATE INDEX `api_keys_keyHash_unique` ON `api_keys` (`keyHash`);