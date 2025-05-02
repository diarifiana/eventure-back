import { Router } from "express";
import { injectable } from "tsyringe";
import { verifyToken } from "../../lib/jwt";
import { uploader } from "../../lib/multer";
import { verifyRole } from "../../middlewares/role.middleware";
import { UploaderMiddleware } from "../../middlewares/uploader.middleware";
import { validateBody } from "../../middlewares/validation.middleware";
import { createTxDetailTO } from "./dto/createTxDetail.dto";
import { TransactionDTO } from "./dto/transaction.dto";
import { TransactionController } from "./transaction.controller";

@injectable()
export class TransactionRouter {
  private router: Router;
  private transactionController: TransactionController;
  private uploaderMiddleware: UploaderMiddleware;

  constructor(
    TransactionController: TransactionController,
    UploaderMiddleware: UploaderMiddleware
  ) {
    this.router = Router();
    this.transactionController = TransactionController;
    this.uploaderMiddleware = UploaderMiddleware;
    this.initializeRoutes();
  }

  private initializeRoutes = () => {
    // this.router.post(
    //   "/",
    //   validateBody(TransactionDTO),
    //   this.transactionController.createTransaction
    // );

    this.router.post(
      "/detail",
      validateBody(createTxDetailTO),
      this.transactionController.createTxDetail
    );

    this.router.get(
      "/tickets/:id",
      verifyToken,
      this.transactionController.getTransactionTickets
    );

    this.router.get(
      "/organizers/:id",
      verifyToken,
      verifyRole(["ADMIN"]),
      this.transactionController.getTransactionsByOrganizer
    );

    this.router.get(
      "/organizers/:id/revenue",
      verifyToken,
      verifyRole(["ADMIN"]),
      this.transactionController.getTransactionsRevenue
    );

    // this.router.get(
    //   "/organizers/:id/total-ticket",
    //   verifyToken,
    //   verifyRole(["ADMIN"]),
    //   this.transactionController.getTransactionTotalTickets
    // );

    this.router.post(
      "/upload/:id",
      verifyToken,
      verifyRole(["USER"]),
      this.uploaderMiddleware.fileFilter([
        "image/jpeg",
        "image/avif",
        "image/png",
        "image/webp",
      ]),
      uploader(1).fields([{ name: "paymentProof", maxCount: 1 }]),
      this.transactionController.uploadPaymentProof
    );

    this.router.patch(
      "/manage/:id",
      verifyToken,
      verifyRole(["ADMIN"]),
      this.transactionController.updateTransaction
    );
  };

  getRouter() {
    return this.router;
  }
}
