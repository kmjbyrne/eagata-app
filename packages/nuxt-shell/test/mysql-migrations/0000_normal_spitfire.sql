CREATE TABLE `org_memberships` (
	`org_id` varchar(64) NOT NULL,
	`user_id` varchar(64) NOT NULL,
	`role` varchar(16) NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `org_memberships_pk` PRIMARY KEY(`org_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `org_slugs` (
	`slug` varchar(32) NOT NULL,
	`org_id` varchar(64) NOT NULL,
	`is_current` boolean NOT NULL,
	`position` int NOT NULL DEFAULT 0,
	CONSTRAINT `org_slugs_slug` PRIMARY KEY(`slug`)
);
--> statement-breakpoint
CREATE TABLE `orgs` (
	`id` varchar(64) NOT NULL,
	`name` varchar(100) NOT NULL,
	`is_personal` boolean NOT NULL DEFAULT false,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `orgs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_identities` (
	`provider` varchar(64) NOT NULL,
	`subject` varchar(191) NOT NULL,
	`user_id` varchar(64) NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `user_identities_pk` PRIMARY KEY(`provider`,`subject`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(64) NOT NULL,
	`display_name` varchar(100) NOT NULL,
	`email` varchar(255) NOT NULL,
	`avatar_url` varchar(2048),
	`is_platform_admin` boolean NOT NULL DEFAULT false,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `workspace_memberships` (
	`workspace_id` varchar(64) NOT NULL,
	`user_id` varchar(64) NOT NULL,
	`role` varchar(16) NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `workspace_memberships_pk` PRIMARY KEY(`workspace_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `workspaces` (
	`id` varchar(64) NOT NULL,
	`org_id` varchar(64) NOT NULL,
	`name` varchar(100) NOT NULL,
	`slug` varchar(32) NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `workspaces_id` PRIMARY KEY(`id`),
	CONSTRAINT `workspaces_org_slug_unique` UNIQUE(`org_id`,`slug`)
);
--> statement-breakpoint
ALTER TABLE `org_memberships` ADD CONSTRAINT `org_memberships_org_id_orgs_id_fk` FOREIGN KEY (`org_id`) REFERENCES `orgs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `org_memberships` ADD CONSTRAINT `org_memberships_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `org_slugs` ADD CONSTRAINT `org_slugs_org_id_orgs_id_fk` FOREIGN KEY (`org_id`) REFERENCES `orgs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_identities` ADD CONSTRAINT `user_identities_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workspace_memberships` ADD CONSTRAINT `workspace_memberships_workspace_id_workspaces_id_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workspace_memberships` ADD CONSTRAINT `workspace_memberships_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workspaces` ADD CONSTRAINT `workspaces_org_id_orgs_id_fk` FOREIGN KEY (`org_id`) REFERENCES `orgs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `org_memberships_user_idx` ON `org_memberships` (`user_id`);--> statement-breakpoint
CREATE INDEX `org_slugs_org_idx` ON `org_slugs` (`org_id`);--> statement-breakpoint
CREATE INDEX `user_identities_user_idx` ON `user_identities` (`user_id`);--> statement-breakpoint
CREATE INDEX `workspace_memberships_user_idx` ON `workspace_memberships` (`user_id`);