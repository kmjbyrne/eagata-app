CREATE TABLE `org_features` (
	`org_id` varchar(64) NOT NULL,
	`feature` varchar(64) NOT NULL,
	`enabled_at` datetime(3) NOT NULL,
	`enabled_by` varchar(64),
	CONSTRAINT `org_features_pk` PRIMARY KEY(`org_id`,`feature`)
);
--> statement-breakpoint
ALTER TABLE `org_features` ADD CONSTRAINT `org_features_org_id_orgs_id_fk` FOREIGN KEY (`org_id`) REFERENCES `orgs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `org_features` ADD CONSTRAINT `org_features_enabled_by_users_id_fk` FOREIGN KEY (`enabled_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;