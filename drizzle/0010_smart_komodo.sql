ALTER TABLE `quotes` ADD `projectNumber` varchar(64);--> statement-breakpoint
ALTER TABLE `quotes` ADD `freteValue` decimal(10,2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `quotes` ADD `freteState` varchar(2);--> statement-breakpoint
ALTER TABLE `quotes` ADD `freteIncluded` boolean DEFAULT false NOT NULL;