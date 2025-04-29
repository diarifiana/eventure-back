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

  uploadOrganizerPic = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const picture = files.profilePic?.[0];
      const userId = res.locals.user?.id;

      if (!files || !picture) {
        throw new ApiError("Please upload a profile picture", 400);
      }

      const result = await this.organizerService.uploadOrganizerPic(
        userId,
        picture
      );

      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };
}
