import { Router } from "express";
import { injectable } from "tsyringe";
import { JwtMiddleware } from "../../middlewares/jwt.middleware";
import { ProfileController } from "./profile.controller";
import { JWT_SECRET_KEY } from "../../config";
import { verifyRole } from "../../middlewares/role.middleware";

@injectable()
export class ProfileRouter {
  private router: Router;
  private profileController: ProfileController;
  private jwtMiddleware: JwtMiddleware;

  constructor(
    ProfileController: ProfileController,
    JwtMiddleware: JwtMiddleware
  ) {
    this.router = Router();
    this.profileController = ProfileController;
    this.jwtMiddleware = JwtMiddleware;
    this.initializeRoutes();
  }

  private initializeRoutes = () => {
    // update profile
    this.router.patch(
      "/update-profile",
      this.jwtMiddleware.verifyToken(JWT_SECRET_KEY!),
      this.profileController.updateProfile
    );

    // coupons
    this.router.get(
      "/coupons",
      this.jwtMiddleware.verifyToken(JWT_SECRET_KEY!),
      this.profileController.getCouponByUserId
    );

    // transactions
    this.router.get(
      "/transactions",
      this.jwtMiddleware.verifyToken(JWT_SECRET_KEY!),
      verifyRole(["USER"]),
      this.profileController.getTransactionsByUserId
    );

    // get profile
    this.router.get(
      "/:id",
      this.jwtMiddleware.verifyToken(JWT_SECRET_KEY!),
      this.profileController.getProfile
    );
  };

  getRouter() {
    return this.router;
  }
}
