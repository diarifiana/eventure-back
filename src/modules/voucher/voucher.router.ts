import { Router } from "express";
import { injectable } from "tsyringe";
import { VoucherController } from "./voucher.controller";

@injectable()
export class VoucherRouter {
  private router: Router;
  private voucherController: VoucherController;

  constructor(VoucherController: VoucherController) {
    this.router = Router();
    this.voucherController = VoucherController;
    this.initializeRoutes();
  }

  private initializeRoutes = () => {
    this.router.post("/", this.voucherController.createVoucher);
    this.router.get("/", this.voucherController.getVoucherByEvent);
    this.router.delete("/:id", this.voucherController.deleteVoucher);
  };

  getRouter() {
    return this.router;
  }
}
