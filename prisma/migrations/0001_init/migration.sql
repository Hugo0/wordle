Loaded Prisma config from prisma/prisma.config.ts.

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "wordle";

-- CreateTable
CREATE TABLE "wordle"."users" (
    "id" TEXT NOT NULL,
    "google_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "display_name" TEXT,
    "avatar_url" TEXT,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wordle"."game_results" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "device_id" TEXT,
    "lang" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'classic',
    "play_type" TEXT NOT NULL DEFAULT 'daily',
    "day_idx" INTEGER,
    "won" BOOLEAN NOT NULL,
    "attempts" INTEGER NOT NULL,
    "played_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wordle"."speed_results" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "device_id" TEXT,
    "lang" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "words_solved" INTEGER NOT NULL,
    "words_failed" INTEGER NOT NULL,
    "max_combo" INTEGER NOT NULL,
    "total_guesses" INTEGER NOT NULL,
    "played_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "speed_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wordle"."badges" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "threshold" INTEGER NOT NULL DEFAULT 0,
    "icon" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wordle"."user_badges" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "badge_id" TEXT NOT NULL,
    "earned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wordle"."subscriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'polar',
    "provider_id" TEXT,
    "plan" TEXT NOT NULL DEFAULT 'lifetime',
    "status" TEXT NOT NULL DEFAULT 'active',
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_google_id_key" ON "wordle"."users"("google_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "wordle"."users"("email");

-- CreateIndex
CREATE INDEX "game_results_user_id_lang_idx" ON "wordle"."game_results"("user_id", "lang");

-- CreateIndex
CREATE INDEX "game_results_user_id_created_at_idx" ON "wordle"."game_results"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "game_results_user_id_lang_mode_play_type_day_idx_key" ON "wordle"."game_results"("user_id", "lang", "mode", "play_type", "day_idx");

-- CreateIndex
CREATE INDEX "speed_results_user_id_lang_idx" ON "wordle"."speed_results"("user_id", "lang");

-- CreateIndex
CREATE INDEX "speed_results_user_id_created_at_idx" ON "wordle"."speed_results"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "badges_slug_key" ON "wordle"."badges"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "user_badges_user_id_badge_id_key" ON "wordle"."user_badges"("user_id", "badge_id");

-- CreateIndex
CREATE INDEX "subscriptions_user_id_idx" ON "wordle"."subscriptions"("user_id");

-- CreateIndex
CREATE INDEX "subscriptions_provider_id_idx" ON "wordle"."subscriptions"("provider_id");

-- AddForeignKey
ALTER TABLE "wordle"."game_results" ADD CONSTRAINT "game_results_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "wordle"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wordle"."speed_results" ADD CONSTRAINT "speed_results_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "wordle"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wordle"."user_badges" ADD CONSTRAINT "user_badges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "wordle"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wordle"."user_badges" ADD CONSTRAINT "user_badges_badge_id_fkey" FOREIGN KEY ("badge_id") REFERENCES "wordle"."badges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wordle"."subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "wordle"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

