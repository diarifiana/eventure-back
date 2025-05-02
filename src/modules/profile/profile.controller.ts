import { NextFunction, Request, Response } from "express";
import { injectable } from "tsyringe";
import { ProfileService } from "./profile.service";

@injectable()
export class ProfileController {
  private profileService: ProfileService;

  constructor(ProfileService: ProfileService) {
    this.profileService = ProfileService;
  }

  getProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.profileService.getProfile(res.locals.user.id);
      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };

  updateProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.profileService.updateProfile(
        res.locals.user.id,
        req.body
      );
      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };

  getCouponByUserId = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const result = await this.profileService.getCouponByUserId(
        res.locals.user.id
      );
      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };

  getTransactionsByUserId = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const userId = res.locals.user.id;
      const result = await this.profileService.getTransactionsByUserId(userId);
      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };
}
