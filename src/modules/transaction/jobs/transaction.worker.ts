import { Worker } from "bullmq";
import { redisConnection } from "../../../lib/redis";
import { ApiError } from "../../../utils/api-error";
import { injectable } from "tsyringe";
import { PrismaService } from "../../prisma/prisma.service";

@injectable()
export class TransactionWorker {
  private prisma: PrismaService;

  constructor(PrismaClient: PrismaService) {
    this.prisma = PrismaClient;
  }

  userTransactionWorker = new Worker(
    "user-transaction-queue",
    async (job) => {
      console.log("Processing job:", job.name, "with data:", job.data);
      const uuid = job.data.uuid;
      const transaction = await this.prisma.transaction.findFirst({
        where: {
          uuid: uuid,
        },
        include: {
          transactionDetails: true,
        },
      });

      if (!transaction) {
        throw new ApiError("Invalid transaction id", 400);
      }

      console.log("Current transaction status:", transaction.status);
      if (transaction.status === "WAITING_FOR_PAYMENT") {
        await this.prisma.$transaction(async (tx) => {
          await tx.transaction.update({
            where: {
              uuid: uuid,
            },
            data: { status: "EXPIRED" },
          });

          for (const detail of transaction.transactionDetails) {
            console.log("Updating ticket:", detail.ticketId, " +", detail.qty);
            await tx.ticket.update({
              where: {
                id: detail.ticketId,
              },
              data: {
                qty: { increment: detail.qty },
              },
            });
          }

          if (transaction.referralCouponUsed) {
            await tx.referralCoupon.update({
              where: {
                referralCoupon: transaction.referralCouponUsed,
              },
              data: { isClaimed: false },
            });
          }

          if (transaction.usePoints) {
            await tx.pointDetail.update({
              where: { userId: transaction.userId },
              data: { amount: transaction.pointsUsed },
            });
          }
        });
      }
    },
    { connection: redisConnection }
  );

  organizationResponseWorker = new Worker(
    "org-response-queue",
    async (job) => {
      console.log("Processing job:", job.name, "with data:", job.data);
      const uuid = job.data.uuid;
      const transaction = await this.prisma.transaction.findFirst({
        where: {
          uuid: uuid,
        },
        include: {
          transactionDetails: true,
        },
      });

      if (!transaction) {
        throw new ApiError("Invalid transaction id", 400);
      }

      console.log("Current transaction status:", transaction.status);
      if (transaction.status === "WAITING_CONFIRMATION") {
        await this.prisma.$transaction(async (tx) => {
          await tx.transaction.update({
            where: {
              uuid: uuid,
            },
            data: { status: "CANCELED" },
          });

          for (const detail of transaction.transactionDetails) {
            console.log("Updating ticket:", detail.ticketId, " +", detail.qty);
            await tx.ticket.update({
              where: {
                id: detail.ticketId,
              },
              data: {
                qty: { increment: detail.qty },
              },
            });
          }

          if (transaction.referralCouponUsed) {
            await tx.referralCoupon.update({
              where: {
                referralCoupon: transaction.referralCouponUsed,
              },
              data: { isClaimed: false },
            });
          }

          if (transaction.usePoints) {
            await tx.pointDetail.update({
              where: { userId: transaction.userId },
              data: { amount: transaction.pointsUsed },
            });
          }
        });
      }
    },
    { connection: redisConnection }
  );
}
