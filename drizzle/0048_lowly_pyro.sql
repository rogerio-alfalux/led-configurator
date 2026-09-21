ALTER TABLE `guest_quote_requests` ADD `parentRequestId` int;--> statement-breakpoint
CREATE INDEX `guest_quote_requests_parent_idx` ON `guest_quote_requests` (`parentRequestId`);