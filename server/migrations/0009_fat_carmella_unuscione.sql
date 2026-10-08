ALTER TABLE `user_identities` MODIFY COLUMN `provider` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL;--> statement-breakpoint
ALTER TABLE `user_identities` MODIFY COLUMN `subject` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL;--> statement-breakpoint
ALTER TABLE `workspace_invitations` MODIFY COLUMN `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL;