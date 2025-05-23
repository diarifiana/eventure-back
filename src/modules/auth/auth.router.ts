import { Router } from "express";
import { injectable } from "tsyringe";
import { validateBody } from "../../middlewares/validation.middleware";
import { AuthController } from "./auth.controller";
import { RegisterDTO } from "./dto/register.dto";
import { LoginDTO } from "./dto/login.dto";
import { ForgotPasswordDTO } from "./dto/forgot-password.dto";
import { UpdateProfileDTO } from "./dto/update-profile.dto";
import { JWT_SECRET_KEY, JWT_SECRET_KEY_FORGOT_PASSWORD } from "../../config";
import { JwtMiddleware } from "../../middlewares/jwt.middleware";
import { ResetPasswordDTO } from "./dto/reset-password.dto";
import { UploaderMiddleware } from "../../middlewares/uploader.middleware";
import { uploader } from "../../lib/multer";
import { verifyToken } from "../../lib/jwt";
import { ChangePasswordDTO } from "./dto/change-password.dto";

@injectable()
export class AuthRouter {
  private router: Router;
  private authController: AuthController;
  private jwtMiddleware: JwtMiddleware;
  private uploaderMiddleware: UploaderMiddleware;

  constructor(
    AuthController: AuthController,
    JwtMiddleware: JwtMiddleware,
    UploaderMiddleware: UploaderMiddleware
  ) {
    this.router = Router();
    this.authController = AuthController;
    this.jwtMiddleware = JwtMiddleware;
    this.uploaderMiddleware = UploaderMiddleware;
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
      this.jwtMiddleware.verifyToken(JWT_SECRET_KEY!),
      validateBody(UpdateProfileDTO),
      this.authController.updateProfile
    );

    this.router.delete(
      "/delete-profile/:id",
      this.authController.deleteProfile
    );

    this.router.patch(
      "/reset-password",
      this.jwtMiddleware.verifyToken(JWT_SECRET_KEY_FORGOT_PASSWORD!),
      validateBody(ResetPasswordDTO),
      this.authController.resetPassword
    );
    this.router.patch(
      "/change-password",
      verifyToken,
      validateBody(ChangePasswordDTO),
      this.authController.changePassword
    );

    this.router.post(
      "/upload-profile-picture",
      verifyToken,
      this.uploaderMiddleware.fileFilter([
        "image/jpeg",
        "image/avif",
        "image/png",
        "image/webp",
      ]),
      uploader(1).fields([{ name: "profilePic", maxCount: 1 }]),
      this.authController.uploadProfilePic
    );
  };

  getRouter() {
    return this.router;
  }
}
