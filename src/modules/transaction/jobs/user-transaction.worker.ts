import "reflect-metadata";
import { container } from "tsyringe";
import { TransactionWorker } from "./transaction.worker";

container.resolve(TransactionWorker);
