CREATE TYPE "public"."project_status" AS ENUM('planned', 'in-progress', 'complete');--> statement-breakpoint
CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"summary" text NOT NULL,
	"status" "project_status" NOT NULL,
	"stack" text[] NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
