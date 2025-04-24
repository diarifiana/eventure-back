import { injectable } from "tsyringe";
import { TransactionService } from "./transaction.service";
import { Request, Response, NextFunction } from "express";
import { ApiError } from "../../utils/api-error";

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
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const picture = files.proofImage?.[0];

      if (!picture) {
        throw new ApiError("No file upload", 400);
      }

      const result = await this.transactionService.uploadImage(picture);
      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };
}
