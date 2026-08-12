CREATE TABLE `guest_quote_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`guestUserId` int NOT NULL,
	`guestName` varchar(256) NOT NULL,
	`guestEmail` varchar(320),
	`officeName` varchar(256) NOT NULL,
	`finalClientName` varchar(256) NOT NULL,
	`constructorName` varchar(256),
	`itemsData` text NOT NULL,
	`status` enum('pending','in_review','quote_ready','cancelled') NOT NULL DEFAULT 'pending',
	`adminQuoteId` int,
	`reviewedByUserId` int,
	`validatedPdfUrl` text,
	`submittedAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`convertedAt` timestamp,
	`pdfSentAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE INDEX `guest_quote_requests_guest_idx` ON `guest_quote_requests` (`guestUserId`);--> statement-breakpoint
CREATE INDEX `guest_quote_requests_status_idx` ON `guest_quote_requests` (`status`);--> statement-breakpoint
CREATE INDEX `guest_quote_requests_quote_idx` ON `guest_quote_requests` (`adminQuoteId`);