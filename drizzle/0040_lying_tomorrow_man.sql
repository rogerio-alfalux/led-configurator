ALTER TABLE `guest_quote_requests` ADD `generalObservation` text;--> statement-breakpoint
ALTER TABLE `guest_quote_requests` ADD `generalObservation` text;--> statement-breakpoint
ALTER TABLE `guest_quote_requests` ADD `desiredQuoteDate` varchar(10);--> statement-breakpoint
ALTER TABLE `guest_quote_requests` ADD `estimatedDeliveryDate` varchar(10);--> statement-breakpoint
CREATE INDEX `guest_quote_requests_desired_quote_date_idx` ON `guest_quote_requests` (`desiredQuoteDate`);
