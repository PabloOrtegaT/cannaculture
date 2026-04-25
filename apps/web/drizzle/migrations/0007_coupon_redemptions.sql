-- F4-14: Add coupon redemption tracking table
CREATE TABLE `couponRedemption` (
	`id` text PRIMARY KEY NOT NULL,
	`couponId` text NOT NULL,
	`orderId` text NOT NULL,
	`userId` text NOT NULL,
	`createdAt` integer DEFAULT (unixepoch('now') * 1000) NOT NULL,
	FOREIGN KEY (`orderId`) REFERENCES `order`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `coupon_redemption_coupon_order_unique` ON `couponRedemption` (`couponId`,`orderId`);
--> statement-breakpoint
CREATE INDEX `coupon_redemption_coupon_user_idx` ON `couponRedemption` (`couponId`,`userId`);
