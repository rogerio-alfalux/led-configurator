CREATE TABLE `quote_additional_costs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`quoteId` int NOT NULL,
	`descricao` varchar(256) NOT NULL,
	`valor` decimal(12,2) NOT NULL,
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `quote_additional_costs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `quote_additional_costs_quoteId_idx` ON `quote_additional_costs` (`quoteId`);