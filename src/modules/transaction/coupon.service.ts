import { injectable } from "tsyringe";
import { PrismaService } from "../prisma/prisma.service";
import { TransactionDTO } from "./dto/transaction.dto";
import { ApiError } from "../../utils/api-error";

@injectable()
export class CouponService {
  private prisma: PrismaService;

  constructor(PrismaClient: PrismaService) {
    this.prisma = PrismaClient;
  }

  validateCoupon = async (body: TransactionDTO) => {
    if (body.referralCouponCode !== "") {
      const coupon = await this.prisma.referralCoupon.findFirst({
        where: { referralCoupon: body.referralCouponCode },
      });

      if (!coupon || coupon.isClaimed === true) {
        throw new ApiError("Coupon invalid", 400);
      } else {
        return coupon.amount;
      }
    }
    return 0;
  };
}
