import { injectable } from "tsyringe";
import { TransactionService } from "./transaction.service";

@injectable()
export class TransactionController {
  private transactionService: TransactionService;

  constructor(TransactionService: TransactionService) {
    this.transactionService = TransactionService;
  }
}
