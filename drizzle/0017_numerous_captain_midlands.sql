CREATE TABLE `backups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type` enum('sql','excel') NOT NULL,
	`fileName` varchar(256) NOT NULL,
	`fileUrl` text NOT NULL,
	`fileKey` varchar(512) NOT NULL,
	`fileSizeBytes` int NOT NULL DEFAULT 0,
	`status` enum('success','error') NOT NULL DEFAULT 'success',
	`errorMessage` text,
	`recordCounts` text,
	`cronTaskUid` varchar(65),
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
