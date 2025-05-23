import { Router } from "express";
import { injectable } from "tsyringe";
import { JWT_SECRET_KEY } from "../../config";
import { JwtMiddleware } from "../../middlewares/jwt.middleware";
import { verifyRole } from "../../middlewares/role.middleware";
import { validateBody } from "../../middlewares/validation.middleware";
import { CreateVoucherDTO } from "./dto/create-voucher.dto";
import { VoucherController } from "./voucher.controller";

@injectable()
export class VoucherRouter {
  private router: Router;
  private voucherController: VoucherController;
  private jwtMiddleware: JwtMiddleware;

  constructor(
    VoucherController: VoucherController,
    JwtMiddleware: JwtMiddleware
  ) {
    this.router = Router();
    this.voucherController = VoucherController;
    this.jwtMiddleware = JwtMiddleware;
    this.initializeRoutes();
  }

  private initializeRoutes = () => {
    this.router.post(
      "/",
      this.jwtMiddleware.verifyToken(JWT_SECRET_KEY!),
      verifyRole(["ADMIN"]),
      validateBody(CreateVoucherDTO),
      this.voucherController.createVoucher
    );
    this.router.get("/", this.voucherController.getVoucherByEvent);
    this.router.delete("/:id", this.voucherController.deleteVoucher);
  };

  getRouter() {
    return this.router;
  }
}
