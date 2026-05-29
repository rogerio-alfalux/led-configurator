CREATE TABLE `assistants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`email` varchar(320),
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `assistants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sellers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(32) NOT NULL,
	`name` varchar(128) NOT NULL,
	`phone` varchar(32),
	`email` varchar(320),
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sellers_id` PRIMARY KEY(`id`),
	CONSTRAINT `sellers_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
ALTER TABLE `quote_versions` ADD `totalFinal` decimal(12,2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `quotes` ADD `seller1Id` int;--> statement-breakpoint
ALTER TABLE `quotes` ADD `seller1Name` varchar(128);--> statement-breakpoint
ALTER TABLE `quotes` ADD `seller2Id` int;--> statement-breakpoint
ALTER TABLE `quotes` ADD `seller2Name` varchar(128);--> statement-breakpoint
ALTER TABLE `quotes` ADD `assistantId` int;--> statement-breakpoint
ALTER TABLE `quotes` ADD `rtPercent` decimal(5,4) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `quotes` ADD `rtDest1` varchar(256);--> statement-breakpoint
ALTER TABLE `quotes` ADD `rtDest1Active` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `quotes` ADD `rtDest2` varchar(256);--> statement-breakpoint
ALTER TABLE `quotes` ADD `rtDest2Active` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `quotes` ADD `rtDest3` varchar(256);--> statement-breakpoint
ALTER TABLE `quotes` ADD `rtDest3Active` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `quotes` ADD `marginPercent` decimal(5,4) DEFAULT '0.10';--> statement-breakpoint
ALTER TABLE `quotes` ADD `freteType` enum('free','paid','night','consult') DEFAULT 'free';--> statement-breakpoint
ALTER TABLE `quotes` ADD `freteIsento` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `quotes` ADD `freteLocalidade` enum('sp','other') DEFAULT 'sp';--> statement-breakpoint
ALTER TABLE `quotes` ADD `totalFinal` decimal(12,2) DEFAULT '0';