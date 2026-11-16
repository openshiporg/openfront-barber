/*
  Warnings:

  - You are about to drop the column `canCreateTodos` on the `Role` table. All the data in the column will be lost.
  - You are about to drop the column `canManageAllTodos` on the `Role` table. All the data in the column will be lost.
  - You are about to drop the `Todo` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TodoImage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_Todo_todoImages` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "UserOnboardingStatusType" AS ENUM ('not_started', 'done', 'dismissed');

-- CreateEnum
CREATE TYPE "BarberProfileWorkStyleType" AS ENUM ('own_space', 'chair_rental', 'mobile');

-- CreateEnum
CREATE TYPE "WeeklyHoursDayOfWeekType" AS ENUM ('sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday');

-- CreateEnum
CREATE TYPE "ClientStatusType" AS ENUM ('active', 'vip', 'blocked');

-- CreateEnum
CREATE TYPE "AppointmentStatusType" AS ENUM ('requested', 'confirmed', 'completed', 'cancelled', 'no_show');

-- CreateEnum
CREATE TYPE "AppointmentSourceType" AS ENUM ('online', 'phone', 'walk_in');

-- CreateEnum
CREATE TYPE "AppointmentPaymentStatusType" AS ENUM ('unpaid', 'deposit_paid', 'paid', 'refunded');

-- CreateEnum
CREATE TYPE "PaymentMethodType" AS ENUM ('cash', 'card', 'transfer', 'stripe');

-- CreateEnum
CREATE TYPE "PaymentKindType" AS ENUM ('deposit', 'service', 'refund', 'no_show_fee');

-- CreateEnum
CREATE TYPE "PaymentStatusType" AS ENUM ('paid', 'refunded');

-- CreateEnum
CREATE TYPE "PaymentSessionStatusType" AS ENUM ('pending', 'captured', 'expired', 'cancelled', 'refunded');

-- CreateEnum
CREATE TYPE "ChairRentalPeriodType" AS ENUM ('weekly', 'monthly');

-- CreateEnum
CREATE TYPE "ChairRentalStatusType" AS ENUM ('active', 'ended');

-- DropForeignKey
ALTER TABLE "Todo" DROP CONSTRAINT "Todo_assignedTo_fkey";

-- DropForeignKey
ALTER TABLE "_Todo_todoImages" DROP CONSTRAINT "_Todo_todoImages_A_fkey";

-- DropForeignKey
ALTER TABLE "_Todo_todoImages" DROP CONSTRAINT "_Todo_todoImages_B_fkey";

-- AlterTable
ALTER TABLE "Role" DROP COLUMN "canCreateTodos",
DROP COLUMN "canManageAllTodos",
ADD COLUMN     "canManageAppointments" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canManageBusiness" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canManageClients" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canManagePayments" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canViewEarnings" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "onboardingStatus" "UserOnboardingStatusType" DEFAULT 'not_started';

-- DropTable
DROP TABLE "Todo";

-- DropTable
DROP TABLE "TodoImage";

-- DropTable
DROP TABLE "_Todo_todoImages";

-- CreateTable
CREATE TABLE "BarberProfile" (
    "id" TEXT NOT NULL,
    "owner" TEXT,
    "businessName" TEXT NOT NULL DEFAULT '',
    "slug" TEXT NOT NULL DEFAULT '',
    "bio" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "location" TEXT NOT NULL DEFAULT '',
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "bookingOpen" BOOLEAN NOT NULL DEFAULT true,
    "slotMinutes" INTEGER NOT NULL DEFAULT 15,
    "bufferMinutes" INTEGER NOT NULL DEFAULT 10,
    "minNoticeHours" INTEGER NOT NULL DEFAULT 2,
    "maxAdvanceDays" INTEGER NOT NULL DEFAULT 60,
    "cancellationWindowHours" INTEGER NOT NULL DEFAULT 24,
    "noShowFeeCents" INTEGER NOT NULL DEFAULT 0,
    "workStyle" "BarberProfileWorkStyleType" NOT NULL DEFAULT 'own_space',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BarberProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "profile" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "priceCents" INTEGER NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 30,
    "depositCents" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyHours" (
    "id" TEXT NOT NULL,
    "profile" TEXT NOT NULL,
    "dayOfWeek" "WeeklyHoursDayOfWeekType" NOT NULL,
    "isWorking" BOOLEAN NOT NULL DEFAULT true,
    "startMinute" INTEGER NOT NULL DEFAULT 540,
    "endMinute" INTEGER NOT NULL DEFAULT 1020,
    "breakStartMinute" INTEGER,
    "breakEndMinute" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeeklyHours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeOff" (
    "id" TEXT NOT NULL,
    "profile" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimeOff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "profile" TEXT NOT NULL,
    "firstName" TEXT NOT NULL DEFAULT '',
    "lastName" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "status" "ClientStatusType" NOT NULL DEFAULT 'active',
    "preferences" TEXT NOT NULL DEFAULT '',
    "lastVisitAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientNote" (
    "id" TEXT NOT NULL,
    "profile" TEXT NOT NULL,
    "client" TEXT,
    "appointment" TEXT,
    "body" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "profile" TEXT NOT NULL,
    "client" TEXT,
    "service" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "serviceNameSnapshot" TEXT NOT NULL DEFAULT '',
    "priceCents" INTEGER NOT NULL DEFAULT 0,
    "depositCents" INTEGER NOT NULL DEFAULT 0,
    "status" "AppointmentStatusType" NOT NULL DEFAULT 'confirmed',
    "source" "AppointmentSourceType" NOT NULL DEFAULT 'phone',
    "paymentStatus" "AppointmentPaymentStatusType" NOT NULL DEFAULT 'unpaid',
    "clientNotes" TEXT NOT NULL DEFAULT '',
    "internalNotes" TEXT NOT NULL DEFAULT '',
    "cancellationReason" TEXT NOT NULL DEFAULT '',
    "publicAccessTokenHash" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "profile" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "priceCents" INTEGER NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductSale" (
    "id" TEXT NOT NULL,
    "profile" TEXT NOT NULL,
    "product" TEXT,
    "client" TEXT,
    "appointment" TEXT,
    "productNameSnapshot" TEXT NOT NULL DEFAULT '',
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPriceCents" INTEGER NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "profile" TEXT,
    "appointment" TEXT,
    "method" "PaymentMethodType" NOT NULL DEFAULT 'cash',
    "kind" "PaymentKindType" NOT NULL DEFAULT 'service',
    "status" "PaymentStatusType" NOT NULL DEFAULT 'paid',
    "amountCents" INTEGER NOT NULL,
    "tipCents" INTEGER NOT NULL DEFAULT 0,
    "productsCents" INTEGER NOT NULL DEFAULT 0,
    "providerReference" TEXT NOT NULL DEFAULT '',
    "paidAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentProvider" (
    "id" TEXT NOT NULL,
    "profile" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "code" TEXT NOT NULL DEFAULT '',
    "isInstalled" BOOLEAN NOT NULL DEFAULT true,
    "createPaymentFunction" TEXT NOT NULL DEFAULT 'manual',
    "capturePaymentFunction" TEXT NOT NULL DEFAULT 'manual',
    "refundPaymentFunction" TEXT NOT NULL DEFAULT 'manual',
    "getPaymentStatusFunction" TEXT NOT NULL DEFAULT 'manual',
    "generatePaymentLinkFunction" TEXT NOT NULL DEFAULT 'manual',
    "handleWebhookFunction" TEXT NOT NULL DEFAULT 'manual',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentSession" (
    "id" TEXT NOT NULL,
    "profile" TEXT,
    "appointment" TEXT,
    "paymentProvider" TEXT,
    "status" "PaymentSessionStatusType" NOT NULL DEFAULT 'pending',
    "amountCents" INTEGER NOT NULL,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "providerPaymentId" TEXT NOT NULL DEFAULT '',
    "expiresAt" TIMESTAMP(3),
    "capturedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChairRental" (
    "id" TEXT NOT NULL,
    "profile" TEXT NOT NULL,
    "hostName" TEXT NOT NULL DEFAULT '',
    "hostContact" TEXT NOT NULL DEFAULT '',
    "rentCents" INTEGER NOT NULL,
    "period" "ChairRentalPeriodType" NOT NULL DEFAULT 'weekly',
    "startsOn" TIMESTAMP(3),
    "endsOn" TIMESTAMP(3),
    "status" "ChairRentalStatusType" NOT NULL DEFAULT 'active',
    "terms" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChairRental_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BarberProfile_owner_key" ON "BarberProfile"("owner");

-- CreateIndex
CREATE UNIQUE INDEX "BarberProfile_slug_key" ON "BarberProfile"("slug");

-- CreateIndex
CREATE INDEX "Service_profile_idx" ON "Service"("profile");

-- CreateIndex
CREATE INDEX "WeeklyHours_profile_idx" ON "WeeklyHours"("profile");

-- CreateIndex
CREATE INDEX "TimeOff_profile_idx" ON "TimeOff"("profile");

-- CreateIndex
CREATE INDEX "Client_profile_idx" ON "Client"("profile");

-- CreateIndex
CREATE INDEX "ClientNote_profile_idx" ON "ClientNote"("profile");

-- CreateIndex
CREATE INDEX "ClientNote_client_idx" ON "ClientNote"("client");

-- CreateIndex
CREATE INDEX "ClientNote_appointment_idx" ON "ClientNote"("appointment");

-- CreateIndex
CREATE INDEX "Appointment_profile_idx" ON "Appointment"("profile");

-- CreateIndex
CREATE INDEX "Appointment_client_idx" ON "Appointment"("client");

-- CreateIndex
CREATE INDEX "Appointment_service_idx" ON "Appointment"("service");

-- CreateIndex
CREATE INDEX "Product_profile_idx" ON "Product"("profile");

-- CreateIndex
CREATE INDEX "ProductSale_profile_idx" ON "ProductSale"("profile");

-- CreateIndex
CREATE INDEX "ProductSale_product_idx" ON "ProductSale"("product");

-- CreateIndex
CREATE INDEX "ProductSale_client_idx" ON "ProductSale"("client");

-- CreateIndex
CREATE INDEX "ProductSale_appointment_idx" ON "ProductSale"("appointment");

-- CreateIndex
CREATE INDEX "Payment_profile_idx" ON "Payment"("profile");

-- CreateIndex
CREATE INDEX "Payment_appointment_idx" ON "Payment"("appointment");

-- CreateIndex
CREATE INDEX "PaymentProvider_profile_idx" ON "PaymentProvider"("profile");

-- CreateIndex
CREATE INDEX "PaymentSession_profile_idx" ON "PaymentSession"("profile");

-- CreateIndex
CREATE INDEX "PaymentSession_appointment_idx" ON "PaymentSession"("appointment");

-- CreateIndex
CREATE INDEX "PaymentSession_paymentProvider_idx" ON "PaymentSession"("paymentProvider");

-- CreateIndex
CREATE INDEX "ChairRental_profile_idx" ON "ChairRental"("profile");

-- AddForeignKey
ALTER TABLE "BarberProfile" ADD CONSTRAINT "BarberProfile_owner_fkey" FOREIGN KEY ("owner") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_profile_fkey" FOREIGN KEY ("profile") REFERENCES "BarberProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyHours" ADD CONSTRAINT "WeeklyHours_profile_fkey" FOREIGN KEY ("profile") REFERENCES "BarberProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeOff" ADD CONSTRAINT "TimeOff_profile_fkey" FOREIGN KEY ("profile") REFERENCES "BarberProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_profile_fkey" FOREIGN KEY ("profile") REFERENCES "BarberProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientNote" ADD CONSTRAINT "ClientNote_profile_fkey" FOREIGN KEY ("profile") REFERENCES "BarberProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientNote" ADD CONSTRAINT "ClientNote_client_fkey" FOREIGN KEY ("client") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientNote" ADD CONSTRAINT "ClientNote_appointment_fkey" FOREIGN KEY ("appointment") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_profile_fkey" FOREIGN KEY ("profile") REFERENCES "BarberProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_client_fkey" FOREIGN KEY ("client") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_service_fkey" FOREIGN KEY ("service") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_profile_fkey" FOREIGN KEY ("profile") REFERENCES "BarberProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSale" ADD CONSTRAINT "ProductSale_profile_fkey" FOREIGN KEY ("profile") REFERENCES "BarberProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSale" ADD CONSTRAINT "ProductSale_product_fkey" FOREIGN KEY ("product") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSale" ADD CONSTRAINT "ProductSale_client_fkey" FOREIGN KEY ("client") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSale" ADD CONSTRAINT "ProductSale_appointment_fkey" FOREIGN KEY ("appointment") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_profile_fkey" FOREIGN KEY ("profile") REFERENCES "BarberProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_appointment_fkey" FOREIGN KEY ("appointment") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentProvider" ADD CONSTRAINT "PaymentProvider_profile_fkey" FOREIGN KEY ("profile") REFERENCES "BarberProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentSession" ADD CONSTRAINT "PaymentSession_profile_fkey" FOREIGN KEY ("profile") REFERENCES "BarberProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentSession" ADD CONSTRAINT "PaymentSession_appointment_fkey" FOREIGN KEY ("appointment") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentSession" ADD CONSTRAINT "PaymentSession_paymentProvider_fkey" FOREIGN KEY ("paymentProvider") REFERENCES "PaymentProvider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChairRental" ADD CONSTRAINT "ChairRental_profile_fkey" FOREIGN KEY ("profile") REFERENCES "BarberProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
