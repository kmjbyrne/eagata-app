CREATE TABLE `platform_roles` (
	`user_id` varchar(64) NOT NULL,
	`role` varchar(32) NOT NULL,
	`granted_at` datetime(3) NOT NULL,
	`granted_by` varchar(64),
	CONSTRAINT `platform_roles_user_id` PRIMARY KEY(`user_id`)
);
--> statement-breakpoint
ALTER TABLE `platform_roles` ADD CONSTRAINT `platform_roles_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `platform_roles` ADD CONSTRAINT `platform_roles_granted_by_users_id_fk` FOREIGN KEY (`granted_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- Hand-written: move existing platform admins across before the flag goes.
-- The original grant time is unknown, so their account's creation time stands in.
INSERT INTO `platform_roles` (`user_id`, `role`, `granted_at`, `granted_by`)
SELECT `id`, 'admin', `created_at`, NULL FROM `users` WHERE `is_platform_admin` = 1;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `is_platform_admin`;