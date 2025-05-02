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

  getTransactionTickets = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const id = Number(req.params.id);
      const result = await this.transactionService.getTransactionTickets(id);
      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };

  getTransactionsByOrganizer = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const id = Number(req.params.id);
      const result = await this.transactionService.getTransactionsByOrganizer(
        id
      );
      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };

  getTransactionsRevenue = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const id = Number(req.params.id);
      const result = await this.transactionService.getTransactionsRevenue(id);
      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };

  getTransactionTotalTickets = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const id = Number(req.params.id);
      const result = await this.transactionService.getTransactionTotalTickets(
        id
      );
      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };

  updateTransaction = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const result = await this.transactionService.updateTransaction(
        Number(req.params.id),
        req.body.action
      );
      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };

  uploadPaymentProof = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const picture = files.paymentProof?.[0];

      if (!picture) {
        throw new ApiError("No file upload", 400);
      }

      const result = await this.transactionService.uploadPaymentProof(
        picture,
        Number(req.params.id)
      );
      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };
}
