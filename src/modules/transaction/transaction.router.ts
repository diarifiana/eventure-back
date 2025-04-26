import { Router } from "express";
import { injectable } from "tsyringe";
import { validateBody } from "../../middlewares/validation.middleware";
import { TransactionDTO } from "./dto/transaction.dto";
import { TransactionController } from "./transaction.controller";
import { uploader } from "../../lib/multer";
import { verifyToken } from "../../lib/jwt";
import { verifyRole } from "../../middlewares/role.middleware";
import { UploaderMiddleware } from "../../middlewares/uploader.middleware";

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
    this.router.post(
      "/",
      validateBody(TransactionDTO),
      this.transactionController.createTransaction
    );

    this.router.get(
      "/user",
      verifyToken,
      this.transactionController.getTransactionsByUser
    );

    this.router.get(
      "/tickets/:id",
      this.transactionController.getTransactionTickets
    );

    this.router.get(
      "/organizers/:id",
      this.transactionController.getTransactionsByOrganizer
    );

    this.router.get(
      "/organizers/:id/revenue",
      this.transactionController.getTransactionsRevenue
    );

    this.router.get(
      "/organizers/:id/total-ticket",
      this.transactionController.getTransactionTotalTickets
    );

    this.router.post(
      "/upload/:id",
      this.uploaderMiddleware.fileFilter([
        "image/jpeg",
        "image/avif",
        "image/png",
      ]),
      uploader(1).fields([{ name: "paymentProof", maxCount: 1 }]),
      this.transactionController.uploadImage
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
