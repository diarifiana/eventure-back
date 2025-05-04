import { Router } from "express";
import { injectable } from "tsyringe";
import { verifyToken } from "../../lib/jwt";
import { uploader } from "../../lib/multer";
import { verifyRole } from "../../middlewares/role.middleware";
import { UploaderMiddleware } from "../../middlewares/uploader.middleware";
import { validateBody } from "../../middlewares/validation.middleware";
import { TransactionDTO } from "./dto/transaction.dto";
import { TransactionController } from "./transaction.controller";
import { JwtMiddleware } from "../../middlewares/jwt.middleware";
import { JWT_SECRET_KEY } from "../../config";

@injectable()
export class TransactionRouter {
  private router: Router;
  private transactionController: TransactionController;
  private jwtMiddleware: JwtMiddleware;

  private uploaderMiddleware: UploaderMiddleware;

  constructor(
    TransactionController: TransactionController,
    JwtMiddleware: JwtMiddleware,
    UploaderMiddleware: UploaderMiddleware
  ) {
    this.router = Router();
    this.transactionController = TransactionController;
    this.jwtMiddleware = JwtMiddleware;
    this.uploaderMiddleware = UploaderMiddleware;
    this.initializeRoutes();
  }

  private initializeRoutes = () => {
    this.router.post(
      "/",
      this.jwtMiddleware.verifyToken(JWT_SECRET_KEY!),
      verifyRole(["USER"]),
      validateBody(TransactionDTO),
      this.transactionController.createTransaction
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
      "/update/:uuid",
      verifyToken,
      verifyRole(["ADMIN"]),
      this.transactionController.updateTransaction
    );
  };

  getRouter() {
    return this.router;
  }
}
