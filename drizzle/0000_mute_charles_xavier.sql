CREATE SCHEMA "smps_db";
--> statement-breakpoint
CREATE TABLE "smps_campus_meal" (
	"id" serial PRIMARY KEY NOT NULL,
	"menu_item_id" integer NOT NULL,
	"type_id" integer NOT NULL,
	"campus_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "smps_campuses" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"address" varchar(500),
	"status" varchar(50) DEFAULT 'active'
);
--> statement-breakpoint
CREATE TABLE "smps_meal_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(50) NOT NULL,
	CONSTRAINT "smps_meal_types_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "smps_menu_campus" (
	"id" serial PRIMARY KEY NOT NULL,
	"campus_meal_id" integer NOT NULL,
	"from" timestamp NOT NULL,
	"to" timestamp
);
--> statement-breakpoint
CREATE TABLE "smps_menu_item" (
	"id" serial PRIMARY KEY NOT NULL,
	"item" varchar(255) NOT NULL,
	"calorie_count" integer
);
--> statement-breakpoint
CREATE TABLE "smps_roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" varchar(255),
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "smps_roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "smps_user_campus_admin" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"campus_id" integer NOT NULL,
	"status" varchar(50) DEFAULT 'active'
);
--> statement-breakpoint
CREATE TABLE "smps_user_meal_record" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"menu_campus_json" jsonb NOT NULL,
	"ordered" boolean DEFAULT false,
	"received" boolean DEFAULT false,
	"reason" varchar(255),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "smps_user_role" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"role_id" integer NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "smps_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"campus_id" integer NOT NULL,
	"address" varchar(500),
	"email" varchar(255) NOT NULL,
	"google_id" varchar(255),
	"status" varchar(50) DEFAULT 'active',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "smps_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "smps_campus_meal" ADD CONSTRAINT "smps_campus_meal_menu_item_id_smps_menu_item_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."smps_menu_item"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "smps_campus_meal" ADD CONSTRAINT "smps_campus_meal_type_id_smps_meal_types_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."smps_meal_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "smps_campus_meal" ADD CONSTRAINT "smps_campus_meal_campus_id_smps_campuses_id_fk" FOREIGN KEY ("campus_id") REFERENCES "public"."smps_campuses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "smps_menu_campus" ADD CONSTRAINT "smps_menu_campus_campus_meal_id_smps_campus_meal_id_fk" FOREIGN KEY ("campus_meal_id") REFERENCES "public"."smps_campus_meal"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "smps_user_campus_admin" ADD CONSTRAINT "smps_user_campus_admin_user_id_smps_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."smps_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "smps_user_campus_admin" ADD CONSTRAINT "smps_user_campus_admin_campus_id_smps_campuses_id_fk" FOREIGN KEY ("campus_id") REFERENCES "public"."smps_campuses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "smps_user_meal_record" ADD CONSTRAINT "smps_user_meal_record_user_id_smps_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."smps_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "smps_user_role" ADD CONSTRAINT "smps_user_role_user_id_smps_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."smps_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "smps_user_role" ADD CONSTRAINT "smps_user_role_role_id_smps_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."smps_roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "smps_users" ADD CONSTRAINT "smps_users_campus_id_smps_campuses_id_fk" FOREIGN KEY ("campus_id") REFERENCES "public"."smps_campuses"("id") ON DELETE no action ON UPDATE no action;