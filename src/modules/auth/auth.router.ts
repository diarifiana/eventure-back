import { Router } from "express";
import { injectable } from "tsyringe";
import { validateBody } from "../../middlewares/validation.middleware";
import { AuthController } from "./auth.controller";
import { RegisterDTO } from "./dto/register.dto";
import { LoginDTO } from "./dto/login.dto";
import { ForgotPasswordDTO } from "./dto/forgot-password.dto";
import { UpdateProfileDTO } from "./dto/update-profile.dto";

@injectable()
export class AuthRouter {
  private router: Router;
  private authController: AuthController;

  constructor(AuthController: AuthController) {
    this.router = Router();
    this.authController = AuthController;
    this.initializeRoutes();
  }

  private initializeRoutes = () => {
    this.router.post(
      "/register",
      validateBody(RegisterDTO),
      this.authController.register
    );

    this.router.post(
      "/login",
      validateBody(LoginDTO),
      this.authController.login
    );

    this.router.post(
      "/forgot-password",
      validateBody(ForgotPasswordDTO),
      this.authController.forgotPassword
    );

    this.router.patch(
      "/update-profile",
      validateBody(UpdateProfileDTO),
      this.authController.updateProfile
    );

    this.router.delete(
      "/delete-profile/:id",
      this.authController.deleteProfile
    );
  };

  getRouter() {
    return this.router;
  }
}
