import { NextFunction, Request, Response } from "express";
import { injectable } from "tsyringe";
import { AuthService } from "./auth.service";
import { ApiError } from "../../utils/api-error";

@injectable()
export class AuthController {
  private authService: AuthService;

  constructor(AuthService: AuthService) {
    this.authService = AuthService;
  }

  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.authService.register(req.body);
      res.status(200).send({ message: "Register Success", data: result });
    } catch (error) {
      next(error);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.authService.login(req.body);
      res.status(200).send({ message: "Login Success", data: result });
    } catch (error) {
      next(error);
    }
  };

  forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.authService.forgotPassword(req.body);
      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };

  updateProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // const userId = res.locals.user.id; // dari token
      const result = await this.authService.updateProfile(
        res.locals.user.id,
        req.body
      );
      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };

  deleteProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = res.locals.user.id; // dari token

      const result = await this.authService.deleteProfile(userId);
      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };

  resetPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.authService.resetPassword(
        req.body,
        res.locals.user.id
      );

      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };

  uploadProfilePic = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      if (!req.file) {
        throw new ApiError("Please upload a profile picture", 400);
      }

      const userId = res.locals.user?.id;
      if (!userId) {
        throw new ApiError("User ID not found in request", 401);
      }

      const picture = req.file;

      const result = (await this.authService.uploadProfilePic(
        userId,
        picture
      )) as { message: string; imageUrl: string };

      res
        .status(200)
        .send(`${result.message}. Profile picture URL: ${result.imageUrl}`);
    } catch (error) {
      next(error);
    }
  };
}
