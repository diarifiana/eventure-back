import { injectable } from "tsyringe";
import { TransactionService } from "./transaction.service";
import { Request, Response, NextFunction } from "express";

@injectable()
export class TransactionController {
  private transactionService: TransactionService;

  constructor(TransactionService: TransactionService) {
    this.transactionService = TransactionService;
  }

  createTransaction = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const userId = res.locals.user.id;
      const result = await this.transactionService.createTransaction(
        req.body,
        userId
      );
      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };

  uploadImage = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.transactionService.uploadImage(
        req.body.thumbnail
      );
      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };
}
