ALTER TABLE `users` ADD CONSTRAINT `users_email_unique` UNIQUE(`email`);--> statement-breakpoint
CREATE INDEX `batches_user_created_idx` ON `batches` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `bug_reports_user_created_idx` ON `bug_reports` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `bug_reports_user_status_idx` ON `bug_reports` (`userId`,`status`);--> statement-breakpoint
CREATE INDEX `bug_reports_batch_idx` ON `bug_reports` (`batchId`);--> statement-breakpoint
CREATE INDEX `bug_summaries_triage_idx` ON `bug_summaries` (`severity`,`priority`,`category`);--> statement-breakpoint
CREATE INDEX `processing_history_user_created_idx` ON `processing_history` (`userId`,`createdAt`);