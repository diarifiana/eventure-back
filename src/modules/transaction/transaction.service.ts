import { injectable } from "tsyringe";
import { cloudinaryUpload } from "../../lib/cloudinary";
import { ApiError } from "../../utils/api-error";
import { PrismaService } from "../prisma/prisma.service";
import { CouponService } from "./coupon.service";
import { TransactionDTO } from "./dto/transaction.dto";
import { PointService } from "./point.service";

@injectable()
export class TransactionService {
  private prisma: PrismaService;
  private couponService: CouponService;
  private pointService: PointService;

  constructor(
    PrismaClient: PrismaService,
    CouponService: CouponService,
    PointService: PointService
  ) {
    this.prisma = PrismaClient;
    this.couponService = CouponService;
    this.pointService = PointService;
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

  uploadImage = async (thumbnail: Express.Multer.File) => {
    const { secure_url } = await cloudinaryUpload(thumbnail, "paymentProof");

    return { message: "Thumbnail uploaded" };
  };
}
