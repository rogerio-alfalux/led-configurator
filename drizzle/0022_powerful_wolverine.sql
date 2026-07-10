CREATE TABLE `driver_price_overrides` (
	`id` int AUTO_INCREMENT NOT NULL,
	`driverCode` varchar(20) NOT NULL,
	`driverModel` varchar(256),
	`customCusto` decimal(10,2) NOT NULL,
	`updatedByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `driver_price_overrides_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_driver_code` UNIQUE(`driverCode`)
);
