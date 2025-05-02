import { injectable } from "tsyringe";
import { ApiError } from "../../utils/api-error";
import { PrismaService } from "../prisma/prisma.service";
import { CouponService } from "./coupon.service";
import { TransactionDTO } from "./dto/transaction.dto";
import { PointService } from "./point.service";
import { join } from "path";
import { transporter } from "../../lib/nodemailer";
import fs from "fs/promises";
import { CloudinaryService } from "../cloudinary/cloudinary.service";
import { eventNames } from "process";
import { MailService } from "../mail/mail.service";
import Mail from "nodemailer/lib/mailer";

@injectable()
export class TransactionService {
  private prisma: PrismaService;
  private couponService: CouponService;
  private pointService: PointService;
  private cloudinaryService: CloudinaryService;
  private mailService: MailService;

  constructor(
    PrismaClient: PrismaService,
    CouponService: CouponService,
    PointService: PointService,
    CloudinaryService: CloudinaryService,
    MailService: MailService
  ) {
    this.prisma = PrismaClient;
    this.couponService = CouponService;
    this.pointService = PointService;
    this.cloudinaryService = CloudinaryService;
    this.mailService = MailService;
  }

  createTransaction = async (body: TransactionDTO, authUserId: number) => {
    const ticket = await this.prisma.ticket.findFirst({
      where: { id: body.ticketId },
    });

    if (!ticket) {
      throw new ApiError("Ticket invalid", 400);
    }

    if (body.qty > ticket.qty) {
      throw new ApiError("Insufficient stock", 400);
    }

    const voucher = await this.prisma.voucher.findFirst({
      where: {
        code: body.voucherCode,
      },
    });

    if (!voucher || voucher?.eventId !== ticket.eventId || voucher.qty <= 0) {
      throw new ApiError("Cannot claim voucher", 400);
    }

    const couponAmount = this.couponService.validateCoupon(body);
    const totalPoints = this.pointService.validatePoint(body);

    const totalToPay =
      ticket.price * body.qty -
      ((await couponAmount) + voucher.discountAmount + (await totalPoints));
    if (totalToPay < 0) {
      throw new ApiError("Discount cannot be claimed", 400);
    }

    const newData = await this.prisma.$transaction(async (tx) => {
      if ((await couponAmount) > 0) {
        await tx.referralCoupon.update({
          where: { referralCoupon: body.referralCouponCode },
          data: { isClaimed: true },
        });
      }

      await tx.voucher.update({
        where: { code: body.voucherCode },
        data: { qty: { decrement: body.qty } },
      });

      await tx.pointDetail.update({
        where: { userId: body.userId },
        data: { amount: 0 },
      });

      await tx.ticket.update({
        where: { id: body.ticketId },
        data: { qty: { decrement: body.qty } },
      });

      return await tx.transaction.create({
        data: { ...body, totalAmount: totalToPay, userId: authUserId },
      });
    });

    return { messsage: "Created successfully", newData };
  };

  getTransactionTickets = async (id: number) => {
    const tickets = await this.prisma.transaction.findMany({
      where: { id },
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
      _count: { id: true },
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

  getTransactionTotalTickets = async (organizerId: number) => {
    const total = await this.prisma.transaction.aggregate({
      where: {
        ticket: {
          event: {
            organizerId,
          },
        },
      },
      _sum: { qty: true },
    });

    if (!total) {
      throw new ApiError("No data", 400);
    }

    return total._sum;
  };

  getTransactionPaymentProof = async (id: number) => {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
    });

    if (!transaction) {
      throw new ApiError("Transaction not found", 404);
    }

    return transaction;
  };

  updateTransaction = async (
    transactionId: number,
    action: "accept" | "reject"
  ) => {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        user: true,
        ticket: {
          include: {
            event: true,
          },
        },
      },
    });

    // cek ada transactionnya gak
    if (!transaction) {
      throw new ApiError("Transaction not found", 404);
    }
    // cek dlu apakah user udh bayar?
    if (transaction.status !== "WAITING_CONFIRMATION") {
      throw new ApiError("Transaction cannot be updated at this stage", 400);
    }

    // cek lagi udh up payment proof belom
    if (!transaction.paymentProof) {
      throw new ApiError("User has not uploaded payment proof", 400);
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

    // kalo reject,
    if (action === "reject") {
      await this.prisma.$transaction(async (tx) => {
        // kembaliin voucher
        if (transaction.voucherId) {
          await tx.voucher.update({
            where: { id: transaction.voucherId },
            data: { qty: { increment: transaction.qty } },
          });
        }
        // kembaliin point
        if (transaction.usePoints) {
          await tx.pointDetail.update({
            where: { userId: transaction.userId },
            data: { amount: { increment: transaction.totalAmount } },
          });
        }
        // kembaliin total toket
        await tx.ticket.update({
          where: { id: transaction.ticketId },
          data: { qty: { increment: transaction.qty } },
        });
        // kembaliin referral kupon
        if (transaction.referralCouponId) {
          await tx.referralCoupon.update({
            where: { id: transaction.referralCouponId },
            data: { isClaimed: false },
          });
        }
      });
    }

    // baru deh update transaksi trus abistu kirim email
    const updatedTransaction = await this.prisma.transaction.update({
      where: { id: transactionId },
      data: { status: updateStatus },
    });

    await this.mailService.sendEmail(
      transaction.user.email,
      emailSubject,
      templateFile,
      {
        name: transaction.user.fullName,
        transactionId: transaction.id,
        transactionAmount: transaction.totalAmount,
        eventName: transaction.ticket.event.name,
        transactionDate: transaction.createdAt,
      }
    );

    return {
      message: `Transaction ${action}ed successfully`,
      data: updatedTransaction,
    };
  };

  uploadPaymentProof = async (
    paymentProof: Express.Multer.File,
    id: number
  ) => {
    const transaction = await this.prisma.transaction.findFirst({
      where: { id },
    });

    if (!transaction) {
      throw new ApiError("No transaction", 400);
    }

    const { secure_url } = await this.cloudinaryService.upload(paymentProof);

    await this.prisma.transaction.update({
      where: {
        id,
      },
      data: {
        paymentProof: secure_url,
        status: "WAITING_CONFIRMATION",
      },
    });
    return { message: `Payment proof uploaded ${secure_url}` };
  };
}
