import { Queue } from "bullmq";
import { redisConnection } from "../../../lib/redis";
import { injectable } from "tsyringe";

@injectable()
export class TransactionQueue {
  userTransactionQueue = new Queue("user-transaction-queue", {
    connection: redisConnection,
  });
}
