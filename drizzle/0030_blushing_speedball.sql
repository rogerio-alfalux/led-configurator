CREATE TABLE `invites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`token` varchar(128) NOT NULL,
	`role` enum('user','convidado','vendedor','assistente','gerente') NOT NULL DEFAULT 'convidado',
	`message` text,
	`invitedByUserId` int,
	`status` enum('pending','accepted','expired','revoked') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`acceptedAt` timestamp,
	`expiresAt` timestamp
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','gerente','vendedor','assistente','convidado') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `users` ADD `passwordHash` varchar(255);