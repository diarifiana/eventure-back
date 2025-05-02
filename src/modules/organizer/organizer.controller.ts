import { NextFunction, Request, Response } from "express";
import { injectable } from "tsyringe";
import { ApiError } from "../../utils/api-error";
import { OrganizerService } from "./organizer.service";

@injectable()
export class OrganizerController {
  private organizerService: OrganizerService;

  constructor(OrganizerService: OrganizerService) {
    this.organizerService = OrganizerService;
  }

  getOrganizerByUserId = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const userId = res.locals.user?.id;
      const organizer = await this.organizerService.getOrganizerByUserId(
        userId
      );
      res.status(200).send(organizer);
    } catch (error) {
      next(error);
    }
  };

  uploadOrganizerPic = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const files = req.files as { [fields: string]: Express.Multer.File[] };
      const picture = files.profilePic?.[0];

      const userId = res.locals.user.id;

      if (!files || !picture) {
        throw new ApiError("Please upload a profile picture", 400);
      }
      // console.log(files);

      const result = await this.organizerService.uploadOrganizerPic(
        userId,
        picture
      );

      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };

  updateOrganizer = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.organizerService.updateOrganizer(
        res.locals.user.id,
        req.body
      );
      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };

  getEventByOrganizer = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const result = await this.organizerService.getEventByOrganizer(
        res.locals.user.id
      );
      console.log("AUTH USER:", res.locals.user);
      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };
}
