CREATE TABLE `feedback` (
	`id` varchar(64) NOT NULL,
	`author_id` varchar(64) NOT NULL,
	`workspace_id` varchar(64),
	`kind` varchar(16) NOT NULL,
	`subject` varchar(255) NOT NULL,
	`body` mediumtext NOT NULL,
	`page_path` varchar(2048),
	`status` varchar(16) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `feedback_id` PRIMARY KEY(`id`),
	CONSTRAINT `feedback_kind_check` CHECK(`feedback`.`kind` IN ('bug', 'idea', 'question', 'other')),
	CONSTRAINT `feedback_status_check` CHECK(`feedback`.`status` IN ('new', 'seen', 'done'))
);
--> statement-breakpoint
CREATE TABLE `feedback_replies` (
	`id` varchar(64) NOT NULL,
	`feedback_id` varchar(64) NOT NULL,
	`author_id` varchar(64) NOT NULL,
	`from_platform` boolean NOT NULL,
	`body` mediumtext NOT NULL,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `feedback_replies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `feedback` ADD CONSTRAINT `feedback_author_id_users_id_fk` FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `feedback` ADD CONSTRAINT `feedback_workspace_id_workspaces_id_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `feedback_replies` ADD CONSTRAINT `feedback_replies_feedback_id_feedback_id_fk` FOREIGN KEY (`feedback_id`) REFERENCES `feedback`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `feedback_replies` ADD CONSTRAINT `feedback_replies_author_id_users_id_fk` FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `feedback_author_idx` ON `feedback` (`author_id`);--> statement-breakpoint
CREATE INDEX `feedback_updated_idx` ON `feedback` (`updated_at`);--> statement-breakpoint
CREATE INDEX `feedback_replies_feedback_idx` ON `feedback_replies` (`feedback_id`,`created_at`);