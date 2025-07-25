import { scheduleJob } from "node-schedule";
import { injectable } from "tsyringe";
import { PrismaService } from "../prisma/prisma.service";

@injectable()
export class CronService {
  private prisma: PrismaService;

  constructor(prismaService: PrismaService) {
    this.prisma = prismaService;
  }

  initCronJobs() {
    this.initPointExpirationCron();
  }

  initPointExpirationCron() {
    scheduleJob("check-points-expiration", "0 0 0 * * *", async () => {
      try {
        const now = new Date();
        const expiredPoints = await this.prisma.pointDetail.findMany({
          where: {
            expiredAt: {
              lt: now,
            },
            amount: {
              gt: 0,
            },
          },
        });

        if (expiredPoints.length > 0) {
          const updatePromises = expiredPoints.map((point) =>
            this.prisma.pointDetail.update({
              where: { id: point.id },
              data: { amount: 0 },
            })
          );

          await Promise.all(updatePromises);
        }
      } catch (error) {}
    });
  }
}
