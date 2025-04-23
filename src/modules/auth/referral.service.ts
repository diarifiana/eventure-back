import { injectable } from "tsyringe";
import { ApiError } from "../../utils/api-error";
import { PrismaService } from "../prisma/prisma.service";

@injectable()
export class ReferralService {
  private prisma: PrismaService;

  constructor(PrismaClient: PrismaService) {
    this.prisma = PrismaClient;
  }

  validateReferralNumber = async (referralNumber?: string) => {
    if (!referralNumber) return;

    const existingReferral = await this.prisma.user.findUnique({
      where: { referralNumber },
    });

    if (!existingReferral) {
      throw new ApiError("Invalid referral code", 400);
    }
  };
}
