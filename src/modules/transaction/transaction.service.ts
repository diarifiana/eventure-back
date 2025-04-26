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

@injectable()
export class TransactionService {
  private prisma: PrismaService;
  private couponService: CouponService;
  private pointService: PointService;
  private cloudinaryService: CloudinaryService;

  constructor(
    PrismaClient: PrismaService,
    CouponService: CouponService,
    PointService: PointService,
    CloudinaryService: CloudinaryService
  ) {
    this.prisma = PrismaClient;
    this.couponService = CouponService;
    this.pointService = PointService;
    this.cloudinaryService = CloudinaryService;
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

  updateTransaction = async (
    transactionId: number,
    action: "accept" | "reject"
  ) => {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        user: true,
      },
    });

    if (!transaction) {
      throw new ApiError("Transaction not found", 404);
    }

    if (transaction.status !== "WAITING_CONFIRMATION") {
      throw new ApiError("Transaction cannot be updated at this stage", 400);
    }

    let updateStatus: "DONE" | "REJECTED";
    let templateFile: string;
    let emailSubject: string;

    if (action === "accept") {
      updateStatus = "DONE";
      templateFile = "accepted-transaction-email.hbs";
      emailSubject = "🎉 Your transaction has been accepted!";
    } else {
      updateStatus = "REJECTED";
      templateFile = "rejected-transaction-email.hbs";
      emailSubject = "❌ Your transaction has been rejected";
    }

    const updatedTransaction = await this.prisma.transaction.update({
      where: { id: transactionId },
      data: { status: updateStatus },
    });

    const templatePath = join(__dirname, `../../templates/${templateFile}`);
    const templateSource = await (await fs.readFile(templatePath)).toString();
    const compiledTemplate = Handlebars.compile(templateSource);
    const html = compiledTemplate({ fullName: transaction.user.fullName });

    await transporter.sendMail({
      to: transaction.user.email,
      subject: emailSubject,
      html,
    });

    return {
      message: `Transaction ${action}ed successfully`,
      data: updatedTransaction,
    };
  };

  uploadImage = async (thumbnail: Express.Multer.File) => {
    const { secure_url } = await this.cloudinaryService.upload(thumbnail);

    return { message: `Thumbnail uploaded ${secure_url}` };
  };
}
