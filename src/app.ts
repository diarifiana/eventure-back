import cors from "cors";
import express, { Express, json } from "express";
import "reflect-metadata";
import { container } from "tsyringe";
import { PORT } from "./config";
import { errorMiddleware } from "./middlewares/error.middleware";
import { SampleRouter } from "./modules/sample/sample.router";
import { AuthRouter } from "./modules/auth/auth.router";
import { TransactionRouter } from "./modules/transaction/transaction.router";
import { ReviewRouter } from "./modules/review/review.router";
import { VoucherRouter } from "./modules/voucher/voucher.router";
import { EventRouter } from "./modules/event/event.router";

export class App {
  public app: Express;

  constructor() {
    this.app = express();
    this.configure();
    this.routes();
    this.handleError();
  }

  private configure() {
    this.app.use(cors());
    this.app.use(json());
  }

  private routes() {
    const sampleRouter = container.resolve(SampleRouter);
    const authRouter = container.resolve(AuthRouter);
    const transactionRouter = container.resolve(TransactionRouter);
    const reviewRouter = container.resolve(ReviewRouter);
    const voucherRouter = container.resolve(VoucherRouter);
    const eventRouter = container.resolve(EventRouter);

    this.app.use("/samples", sampleRouter.getRouter());
    this.app.use("/auth", authRouter.getRouter());
    this.app.use("/transactions", transactionRouter.getRouter());
    this.app.use("/reviews", reviewRouter.getRouter());
    this.app.use("/vouchers", voucherRouter.getRouter());
    this.app.use("/events", eventRouter.getRouter());
  }

  private handleError() {
    this.app.use(errorMiddleware);
  }

  public start() {
    this.app.listen(PORT, () => {
      console.log(`Server running on PORT : ${PORT}`);
    });
  }
}
