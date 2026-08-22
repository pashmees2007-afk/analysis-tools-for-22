CREATE TABLE `segmentation_analyses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`analysisId` varchar(64) NOT NULL,
	`userOpenId` varchar(64),
	`sourceUrl` text NOT NULL,
	`predictionUrl` text NOT NULL,
	`overlayUrl` text NOT NULL,
	`modelVersion` varchar(128) NOT NULL,
	`metricsJson` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `segmentation_analyses_id` PRIMARY KEY(`id`),
	CONSTRAINT `segmentation_analyses_analysisId_unique` UNIQUE(`analysisId`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
