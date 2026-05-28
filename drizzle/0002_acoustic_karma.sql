CREATE TABLE `quote_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`quoteVersionId` int NOT NULL,
	`quoteId` int NOT NULL,
	`itemNumber` int NOT NULL,
	`itemData` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `quote_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quote_versions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`quoteId` int NOT NULL,
	`version` int NOT NULL,
	`headerSnapshot` text NOT NULL,
	`totalAmount` decimal(12,2) DEFAULT '0',
	`createdByUserId` int NOT NULL,
	`assistantName` varchar(128),
	`vendorName` varchar(128),
	`versionNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `quote_versions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quotes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`quoteNumber` varchar(32) NOT NULL,
	`clientName` varchar(256) NOT NULL,
	`clientContact` varchar(128),
	`clientPhone` varchar(64),
	`clientEmail` varchar(320),
	`projectName` varchar(256),
	`projectRef` varchar(128),
	`vendorName` varchar(128),
	`assistantName` varchar(128),
	`createdByUserId` int NOT NULL,
	`status` enum('open','approved','lost','cancelled') NOT NULL DEFAULT 'open',
	`currentVersion` int NOT NULL DEFAULT 1,
	`totalAmount` decimal(12,2) DEFAULT '0',
	`approvedAt` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `quotes_id` PRIMARY KEY(`id`),
	CONSTRAINT `quotes_quoteNumber_unique` UNIQUE(`quoteNumber`)
);
