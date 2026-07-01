CREATE TABLE `quote_number_sequences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vendorPrefix` varchar(10) NOT NULL,
	`year` varchar(4) NOT NULL,
	`nextSeq` int NOT NULL DEFAULT 1,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `quote_number_sequences_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_vendor_year` UNIQUE(`vendorPrefix`,`year`)
);
