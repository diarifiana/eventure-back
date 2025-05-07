import { injectable } from "tsyringe";
import { ApiError } from "../../utils/api-error";
import { CloudinaryService } from "../cloudinary/cloudinary.service";
import { MailService } from "../mail/mail.service";
import { PrismaService } from "../prisma/prisma.service";
import { CouponService } from "./coupon.service";
import { TransactionDTO } from "./dto/transaction.dto";
import { TransactionQueue } from "./jobs/transaction.queue";
import { PointService } from "./point.service";

@injectable()
export class TransactionService {
  private prisma: PrismaService;
  private couponService: CouponService;
  private pointService: PointService;
  private cloudinaryService: CloudinaryService;
  private mailService: MailService;
  private transactionQueue: TransactionQueue;

  constructor(
    PrismaClient: PrismaService,
    CouponService: CouponService,
    PointService: PointService,
    CloudinaryService: CloudinaryService,
    MailService: MailService,
    TransactionQueue: TransactionQueue
  ) {
    this.prisma = PrismaClient;
    this.couponService = CouponService;
    this.pointService = PointService;
    this.cloudinaryService = CloudinaryService;
    this.mailService = MailService;
    this.transactionQueue = TransactionQueue;
  }

  createTransaction = async (
    authUserId: number,
    body: TransactionDTO,
    slug: string
  ) => {
    if (!body.details || body.details.length === 0) {
      throw new ApiError("Details cannot be empty", 400);
    }

    const ticket = await this.prisma.ticket.findFirst({
      where: { id: body.details[0].ticketId },
    });

    let availablePoints = 0;
    if (body.usePoints) {
      availablePoints = await this.pointService.getAvailablePoints(
        body,
        authUserId
      );
    }

    let voucherDiscount = 0;
    if (body.voucherCode) {
      const voucher = await this.prisma.voucher.findFirst({
        where: {
          code: body.voucherCode,
          eventName: ticket?.eventName,
          endDate: {
            gt: new Date(),
          },
        },
      });

      if (!voucher) {
        throw new ApiError("Invalid voucher", 400);
      }

      voucherDiscount = voucher.discountAmount;
    }

    let couponDiscount = 0;
    if (body.referralCouponCode) {
      couponDiscount = await this.couponService.validateCoupon(body);
    }

    const newData = await this.prisma.$transaction(async (tx) => {
      let totalToPay = 0;

      for (const detail of body.details) {
        const ticket = await tx.ticket.findFirst({
          where: { id: detail.ticketId },
        });

        if (!ticket) {
          throw new ApiError("Ticket not found", 400);
        }

        if (detail.qty > ticket.qty) {
          throw new ApiError("Insufficient ticket stock", 422);
        }

        await tx.ticket.update({
          where: { id: detail.ticketId },
          data: { qty: { decrement: detail.qty } },
        });

        await tx.event.update({
          where: { name: ticket.eventName },
          data: {
            totalTransactions: {
              increment: detail.qty,
            },
          },
        });

        const subtotal = (ticket.price - voucherDiscount) * detail.qty;

        if (subtotal < 0) {
          throw new ApiError("Total after discount cannot be negative", 400);
        }
        totalToPay += subtotal;
      }
      totalToPay -= couponDiscount;
      totalToPay = totalToPay < 0 ? 0 : totalToPay;

      const usedPoints =
        totalToPay < availablePoints ? totalToPay : availablePoints;
      totalToPay -= usedPoints;
      availablePoints -= usedPoints;

      if (usedPoints > 0) {
        await tx.pointDetail.update({
          where: { userId: authUserId },
          data: { amount: availablePoints },
        });
      }

      if (couponDiscount > 0) {
        await tx.referralCoupon.update({
          where: {
            referralCoupon: body.referralCouponCode,
          },
          data: { isClaimed: true },
        });
      }

      const newTransaction = await tx.transaction.create({
        data: {
          totalAmount: totalToPay,
          userId: authUserId,
          referralCouponUsed: body.referralCouponCode || undefined,
          voucherUsed: body.voucherCode || undefined,
          usePoints: !!body.usePoints,
          pointsUsed: usedPoints,
        },
      });

      await tx.transactionDetail.createMany({
        data: body.details.map((detail) => ({
          transactionId: newTransaction.uuid,
          ticketId: detail.ticketId,
          qty: detail.qty,
        })),
      });

      await this.transactionQueue.userTransactionQueue.add(
        "expire-transaction",
        {
          uuid: newTransaction.uuid,
        },
        {
          delay: 2 * 60 * 60 * 1000,
          removeOnComplete: true,
          attempts: 3,
          backoff: { type: "exponential", delay: 1000 },
        }
      );

      await this.transactionQueue.userTransactionQueue.add(
        "organization-response",
        {
          uuid: newTransaction.uuid,
        },
        {
          delay: 3 * 24 * 60 * 60 * 1000,
          removeOnComplete: true,
          attempts: 3,
          backoff: { type: "exponential", delay: 1000 },
        }
      );
      return newTransaction;
    });

    return {
      message: "Transaction successful",
      data: { ...newData },
    };
  };

  getTransaction = async (authUserId: number, uuid: string) => {
    const transaction = await this.prisma.transaction.findFirst({
      where: { uuid },
      include: {
        transactionDetails: {
          include: { ticket: { include: { event: true } } },
        },
        referralCoupon: true,
        voucher: true,
      },
    });

    if (!transaction) {
      throw new ApiError(`No records for ${uuid}`, 400);
    }

    // if (transaction.userId !== authUserId) {
    //   throw new ApiError("Unauthorized", 401);
    // }

    return transaction;
  };

  getTransactionsByUser = async (authUserId: number) => {
    const transactions = await this.prisma.transaction.findMany({
      where: {
        userId: authUserId,
      },
      include: {
        transactionDetails: {
          include: {
            ticket: {
              include: {
                event: true,
              },
            },
          },
        },
      },
    });

    if (!transactions || transactions.length === 0) {
      throw new ApiError("No transactions found for this user.", 404);
    }

    return transactions;
  };

  getTransactionTickets = async (uuid: string) => {
    const tickets = await this.prisma.transaction.findMany({
      where: { uuid },
      select: { ticket: { select: { event: true } } },
    });

    if (!tickets) {
      throw new ApiError("No data", 400);
    }
    return tickets;
  };

  getTransactionsByOrganizer = async (organizerId: number) => {
    const transactions = await this.prisma.transaction.findMany({
      where: {
        ticket: {
          event: {
            organizerId,
          },
        },
      },
    });

    const totalTransaction = await this.prisma.transaction.aggregate({
      where: {
        ticket: {
          event: {
            organizerId,
          },
        },
      },
      _count: { uuid: true },
    });

    return { transactions: transactions, totalTransaction: totalTransaction };
  };

  getTransactionsRevenue = async (organizerId: number) => {
    const revenue = await this.prisma.transaction.aggregate({
      where: {
        ticket: {
          event: {
            organizerId,
          },
        },
      },
      _sum: { totalAmount: true },
    });

    if (!revenue) {
      throw new ApiError("No data", 400);
    }

    return revenue._sum;
  };

  getTransactionPaymentProof = async (uuid: string) => {
    const transaction = await this.prisma.transaction.findUnique({
      where: { uuid },
    });

    if (!transaction) {
      throw new ApiError("Transaction not found", 404);
    }

    return transaction;
  };

  updateTransaction = async (
    authUserId: number,
    uuid: string,
    action: "accept" | "reject"
  ) => {
    const transaction = await this.prisma.transaction.findUnique({
      where: { uuid },
      include: {
        user: true,
        transactionDetails: {
          include: {
            ticket: {
              include: {
                event: true,
              },
            },
          },
        },
      },
    });

    if (!transaction) throw new ApiError("Transaction not found", 404);
    if (transaction.status !== "WAITING_CONFIRMATION") {
      throw new ApiError("Transaction cannot be updated at this stage", 400);
    }
    if (!transaction.paymentProof) {
      throw new ApiError("User has not uploaded payment proof", 400);
    }

    const user = await this.prisma.user.findUnique({
      where: { id: authUserId },
      include: { organizer: true },
    });

    if (!user?.organizer) {
      throw new ApiError("You don't have an organizer account", 403);
    }

    const isAuthorized = transaction.transactionDetails.some(
      (detail) => detail.ticket.event.organizerId === user.organizer!.id
    );

    if (!isAuthorized) {
      throw new ApiError(
        "You are not authorized to update this transaction",
        403
      );
    }

    let updateStatus: "DONE" | "REJECTED";
    let templateFile: string;
    let emailSubject: string;

    if (action === "reject") {
      updateStatus = "REJECTED";
      templateFile = "rejected-transaction-email";
      emailSubject = "❌ Your transaction has been rejected!";
    } else {
      updateStatus = "DONE";
      templateFile = "accepted-transaction-email";
      emailSubject = "🎉 Your transaction has been accepted";
    }

    await this.prisma.$transaction(async (tx) => {
      if (action === "reject") {
        for (const detail of transaction.transactionDetails) {
          await tx.ticket.update({
            where: { id: detail.ticketId },
            data: {
              qty: { increment: detail.qty },
            },
          });
        }

        if (transaction.usePoints && transaction.pointsUsed > 0) {
          await tx.pointDetail.update({
            where: { userId: transaction.userId },
            data: { amount: { increment: transaction.pointsUsed } },
          });
        }

        if (transaction.voucherUsed) {
          await tx.voucher.update({
            where: { code: transaction.voucherUsed },
            data: {},
          });
        }

        if (transaction.referralCouponUsed) {
          await tx.referralCoupon.update({
            where: { referralCoupon: transaction.referralCouponUsed },
            data: { isClaimed: false },
          });
        }

        const expireJob =
          await this.transactionQueue.userTransactionQueue.getJob(
            `expire-transaction:${uuid}`
          );
        if (expireJob) {
          await expireJob.remove();
        }

        const organizationJob =
          await this.transactionQueue.userTransactionQueue.getJob(
            `organization-response:${uuid}`
          );
        if (organizationJob) {
          await organizationJob.remove();
        }
      }

      if (action === "accept") {
        await this.transactionQueue.userTransactionQueue.add(
          "organizer-followup",
          { uuid },
          {
            jobId: `organizer-followup:${uuid}`,
            delay: 5 * 24 * 60 * 60 * 1000, // 5 days
            removeOnComplete: true,
            attempts: 3,
            backoff: { type: "exponential", delay: 1000 },
          }
        );

        const eventIds = new Set<number>();

        transaction.transactionDetails.forEach((detail) => {
          if (detail.ticket.event.id) {
            eventIds.add(detail.ticket.event.id);
          }
        });

        for (const eventId of eventIds) {
          await tx.event.update({
            where: { id: eventId },
            data: { totalTransactions: { increment: 1 } },
          });
        }
      }

      await tx.transaction.update({
        where: { uuid },
        data: { status: updateStatus },
      });
    });

    await this.mailService.sendEmail(
      transaction.user.email,
      emailSubject,
      templateFile,
      {
        fullname: transaction.user.fullName,
        transactionId: uuid,
        transactionAmount: transaction.totalAmount,
        eventName: transaction.transactionDetails[0]?.ticket.event.name,
        transactionDate: transaction.createdAt,
      }
    );

    return {
      message: `Transaction ${action}ed successfully`,
      data: { uuid, status: updateStatus },
    };
  };

  uploadPaymentProof = async (
    paymentProof: Express.Multer.File,
    uuid: string
  ) => {
    const transaction = await this.prisma.transaction.findFirst({
      where: { uuid },
    });

    if (!transaction) {
      throw new ApiError("No transaction", 400);
    }

    const { secure_url } = await this.cloudinaryService.upload(paymentProof);

    await this.prisma.transaction.update({
      where: {
        uuid,
      },
      data: {
        paymentProof: secure_url,
        status: "WAITING_CONFIRMATION",
      },
    });
    return { message: `Payment proof uploaded ${secure_url}` };
  };
}
