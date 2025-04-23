import { injectable } from "tsyringe";
import { PrismaService } from "../prisma/prisma.service";
import { TransactionDTO } from "./dto/transaction.dto";
import { ApiError } from "../../utils/api-error";
import { CouponService } from "./coupon.service";
import { VoucherService } from "./voucher.service";
import { PointService } from "./point.service";

@injectable()
export class TransactionService {
  private prisma: PrismaService;
  private couponService: CouponService;
  private voucherService: VoucherService;
  private pointService: PointService;

  constructor(
    PrismaClient: PrismaService,
    CouponService: CouponService,
    VoucherService: VoucherService,
    PointService: PointService
  ) {
    this.prisma = PrismaClient;
    this.couponService = CouponService;
    this.voucherService = VoucherService;
    this.pointService = PointService;
  }

  createTransactionService = async (
    body: TransactionDTO,
    authUserId: number
  ) => {
    const ticket = await this.prisma.ticket.findFirst({
      where: { id: body.ticketId },
    });

    if (!ticket) {
      throw new ApiError("Ticket invalid", 400);
    }

    if (body.qty > ticket.qty) {
      throw new ApiError("Insufficient stock", 400);
    }

    const couponAmount = this.couponService.validateCoupon(body);
    const voucherAmount = this.voucherService.validateVoucher(body);
    const totalPoints = this.pointService.validatePoint(body);

    // calculate A = qty * ticket
    // calculate B = coupon amount + voucher amount
    // jika A < B, throw error

    const totalToPay =
      ticket.price * body.qty -
      ((await couponAmount) + (await voucherAmount) + (await totalPoints));
    if (totalToPay < 0) {
      throw new ApiError("Discount cannot be claimed", 400);
    }

    //=================== perlu tambah penghitungan point =============//

    // jika coupon & voucher valid, create transaction
    // ubah isClaimed coupon to true & decrease qty voucher
    // decrease qty ticket
    // calculate amount = qty * ticket - (coupon amount + voucher amount)

    const newData = await this.prisma.$transaction(async (tx) => {
      if ((await couponAmount) > 0) {
        await tx.referralCoupon.update({
          where: { referralCoupon: body.referralCouponCode },
          data: { isClaimed: true },
        });
      }

      if ((await voucherAmount) > 0) {
        await tx.voucher.update({
          where: { code: body.voucherCode },
          data: { qty: { decrement: body.qty } },
        });
      }

      if ((await totalPoints) > 0) {
        await tx.pointDetail.update({
          where: { userId: body.userId },
          data: { amount: 0 },
        });
      }

      await tx.ticket.update({
        where: { id: body.ticketId },
        data: { qty: { decrement: body.qty } },
      });

      return await tx.transaction.create({
        data: { ...body, totalAmount: totalToPay, userId: authUserId },
      });
    });

    //=========== perlu install redis ===============//
    //   await userTransactionQueue.add(
    //     "new-transaction",
    //     {
    //       uuid: newData.uuid,
    //     },
    //     {
    //       delay: 300000,
    //       removeOnComplete: true,
    //       attempts: 3,
    //       backoff: { type: "exponential", delay: 1000 },
    //     }
    //   );

    return { messsage: "Created successfully", newData };
  };
}
