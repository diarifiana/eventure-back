// src/modules/cron/cron.service.ts
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

    console.log("cron job mualiii");
  }

  initPointExpirationCron() {
    scheduleJob("check-points-expiration", "0 0 0 * * *", async () => {
      console.log("RUNNING DAILY POINT EXPIRATION CHECK AT MIDNIGHT");

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

        console.log(`ketemuu ${expiredPoints.length} expired points`);

        if (expiredPoints.length > 0) {
          const updatePromises = expiredPoints.map((point) =>
            this.prisma.pointDetail.update({
              where: { id: point.id },
              data: { amount: 0 },
            })
          );

          await Promise.all(updatePromises);
          console.log(
            `gacor bisa update ${expiredPoints.length} expired point ke 0`
          );
        }
      } catch (error) {
        console.error("Error in check-points-expiration job:", error);
      }
    });

    console.log("cron job running muluuu");
  }
}
