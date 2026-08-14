CREATE TABLE `guest_quote_request_attachments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` int NOT NULL,
	`fileName` varchar(256) NOT NULL,
	`storageKey` text NOT NULL,
	`fileUrl` text NOT NULL,
	`mimeType` varchar(128) NOT NULL,
	`fileSize` int NOT NULL,
	`uploadedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `ld_guest_contact_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`guestUserId` int NOT NULL,
	`contactName` varchar(256) NOT NULL,
	`contactPhone` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ld_guest_contact_profiles_guest_unique` UNIQUE(`guestUserId`)
);
--> statement-breakpoint
ALTER TABLE `guest_quote_requests` ADD `contactName` varchar(256);--> statement-breakpoint
ALTER TABLE `guest_quote_requests` ADD `contactPhone` varchar(64);--> statement-breakpoint
ALTER TABLE `guest_quote_requests` ADD `workState` varchar(2);--> statement-breakpoint
ALTER TABLE `guest_quote_requests` ADD `workCity` varchar(128);--> statement-breakpoint
ALTER TABLE `guest_quote_requests` ADD `guestResponseViewedAt` timestamp;--> statement-breakpoint
CREATE INDEX `guest_quote_request_attachments_request_idx` ON `guest_quote_request_attachments` (`requestId`);
