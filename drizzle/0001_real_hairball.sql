CREATE TABLE `batches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`status` enum('QUEUED','PROCESSING','COMPLETED','COMPLETED_WITH_ERRORS') NOT NULL DEFAULT 'QUEUED',
	`totalReports` int NOT NULL DEFAULT 0,
	`processedReports` int NOT NULL DEFAULT 0,
	`failedReports` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `batches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bug_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`batchId` int,
	`title` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`rawText` text NOT NULL,
	`environment` text,
	`appModule` varchar(120),
	`reportedSeverity` varchar(20),
	`status` enum('PENDING','ANALYZING','ANALYZED','FAILED') NOT NULL DEFAULT 'PENDING',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bug_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bug_summaries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bugReportId` int NOT NULL,
	`summary` text NOT NULL,
	`severity` enum('CRITICAL','HIGH','MEDIUM','LOW') NOT NULL,
	`priority` enum('P0','P1','P2','P3') NOT NULL,
	`category` enum('AUTH','PAYMENT','UI_UX','PERFORMANCE','DATA','API','SECURITY','INFRASTRUCTURE','OTHER') NOT NULL,
	`impact` text NOT NULL,
	`stepsToReproduce` text NOT NULL,
	`expectedBehavior` text NOT NULL,
	`actualBehavior` text NOT NULL,
	`environment` text NOT NULL,
	`possibleRootCause` text NOT NULL,
	`recommendedAction` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `bug_summaries_id` PRIMARY KEY(`id`),
	CONSTRAINT `bug_summaries_bugReportId_unique` UNIQUE(`bugReportId`)
);
--> statement-breakpoint
CREATE TABLE `processing_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`bugReportId` int,
	`batchId` int,
	`processingStatus` enum('PROCESSING','SUCCESS','FAILED') NOT NULL,
	`processingTime` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `processing_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `passwordHash` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `disabled` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `batches` ADD CONSTRAINT `batches_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bug_reports` ADD CONSTRAINT `bug_reports_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bug_reports` ADD CONSTRAINT `bug_reports_batchId_batches_id_fk` FOREIGN KEY (`batchId`) REFERENCES `batches`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bug_summaries` ADD CONSTRAINT `bug_summaries_bugReportId_bug_reports_id_fk` FOREIGN KEY (`bugReportId`) REFERENCES `bug_reports`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `processing_history` ADD CONSTRAINT `processing_history_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `processing_history` ADD CONSTRAINT `processing_history_bugReportId_bug_reports_id_fk` FOREIGN KEY (`bugReportId`) REFERENCES `bug_reports`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `processing_history` ADD CONSTRAINT `processing_history_batchId_batches_id_fk` FOREIGN KEY (`batchId`) REFERENCES `batches`(`id`) ON DELETE set null ON UPDATE no action;