ALTER TABLE "User" ADD COLUMN "firstName" TEXT,
ADD COLUMN "lastName" TEXT,
ADD COLUMN "username" TEXT,
ADD COLUMN "avatar" TEXT;
UPDATE "User" SET "firstName" = "name" WHERE "name" IS NOT NULL;
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
