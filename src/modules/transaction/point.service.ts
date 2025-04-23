import { injectable } from "tsyringe";
import { PrismaService } from "../prisma/prisma.service";
import { TransactionDTO } from "./dto/transaction.dto";
import { ApiError } from "../../utils/api-error";

@injectable()
export class PointService {
  private prisma: PrismaService;

  constructor(PrismaClient: PrismaService) {
    this.prisma = PrismaClient;
  }

  validatePoint = async (body: TransactionDTO) => {
    if (body.usePoints === true) {
      const point = await this.prisma.pointDetail.findFirst({
        where: { userId: body.userId },
      });

      if (!point || point.amount === 0) {
        throw new ApiError("Points invalid", 400);
      } else {
        return point.amount;
      }
    }
    return 0;
  };
}
