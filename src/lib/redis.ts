import IORedis from "ioredis";

export const redisConnection = new IORedis({
  host: "localhost",
  port: 6379,
  maxRetriesPerRequest: null,
});
