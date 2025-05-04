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

  getAvailablePoints = async (body: TransactionDTO, authUserId: number) => {
    if (body.usePoints === true) {
      const point = await this.prisma.pointDetail.findFirst({
        where: { userId: authUserId },
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
