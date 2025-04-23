import { injectable } from "tsyringe";
import { PrismaService } from "../prisma/prisma.service";
import { TransactionDTO } from "./dto/transaction.dto";
import { ApiError } from "../../utils/api-error";

@injectable()
export class VoucherService {
  private prisma: PrismaService;

  constructor(PrismaClient: PrismaService) {
    this.prisma = PrismaClient;
  }

  validateVoucher = async (body: TransactionDTO) => {
    if (body.voucherCode !== "") {
      const voucher = await this.prisma.voucher.findFirst({
        where: { code: body.voucherCode },
      });

      if (!voucher || voucher.qty <= 0) {
        throw new ApiError("Voucher invalid", 400);
      } else {
        return voucher.discountAmount;
      }
    }
    return 0;
  };
}
