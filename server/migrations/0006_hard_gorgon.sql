ALTER TABLE `feedback` DROP FOREIGN KEY `feedback_workspace_id_workspaces_id_fk`;
--> statement-breakpoint
DROP INDEX `feedback_author_idx` ON `feedback`;--> statement-breakpoint
ALTER TABLE `feedback` MODIFY COLUMN `workspace_id` varchar(64);--> statement-breakpoint
ALTER TABLE `feedback` ADD CONSTRAINT `feedback_workspace_id_workspaces_id_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `feedback_author_idx` ON `feedback` (`author_id`);