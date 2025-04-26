import { Router } from "express";
import { injectable } from "tsyringe";
import { validateBody } from "../../middlewares/validation.middleware";
import { TransactionDTO } from "./dto/transaction.dto";
import { TransactionController } from "./transaction.controller";
import { uploader } from "../../lib/multer";
import { verifyToken } from "../../lib/jwt";
import { verifyRole } from "../../middlewares/role.middleware";

@injectable()
export class TransactionRouter {
  private router: Router;
  private transactionController: TransactionController;

  constructor(TransactionController: TransactionController) {
    this.router = Router();
    this.transactionController = TransactionController;
    this.initializeRoutes();
  }

  private initializeRoutes = () => {
    this.router.post(
      "/",
      validateBody(TransactionDTO),
      this.transactionController.createTransaction
    );

    this.router.post(
      "/upload",
      uploader(1).fields([{ name: "thumbnail", maxCount: 1 }]),
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
