CREATE TABLE `monthly_billings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`year` int NOT NULL,
	`month` int NOT NULL,
	`amount` decimal(14,2) NOT NULL,
	`setByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
ALTER TABLE `quotes` ADD `isProspecting` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `sample_orders` ADD `kind` enum('sample','maintenance') DEFAULT 'sample' NOT NULL;--> statement-breakpoint
CREATE INDEX `monthly_billings_year_month_idx` ON `monthly_billings` (`year`,`month`);
