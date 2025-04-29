import { Router } from "express";
import { injectable } from "tsyringe";

import { verifyToken } from "../../lib/jwt";
import { uploader } from "../../lib/multer";
import { JwtMiddleware } from "../../middlewares/jwt.middleware";
import { UploaderMiddleware } from "../../middlewares/uploader.middleware";
import { validateBody } from "../../middlewares/validation.middleware";
import { uploadOrganizerDTO } from "./dto/upload-organizer.dto";
import { OrganizerController } from "./organizer.controller";

@injectable()
export class OrganizerRouter {
  private router: Router;
  private organizerController: OrganizerController;
  private uploaderMiddleware: UploaderMiddleware;

  constructor(
    OrganizerController: OrganizerController,
    UploaderMiddleware: UploaderMiddleware
  ) {
    this.router = Router();
    this.organizerController = OrganizerController;
    this.uploaderMiddleware = UploaderMiddleware;
    this.initializeRoutes();
  }

  private initializeRoutes = () => {
    this.router.post(
      "/upload-organizer-picture",
      verifyToken,
      validateBody(uploadOrganizerDTO),
      this.uploaderMiddleware.fileFilter([
        "image/jpeg",
        "image/avif",
        "image/png",
        "image/webp",
      ]),
      uploader(1).fields([{ name: "profilePic", maxCount: 1 }]),
      this.organizerController.uploadOrganizerPic
    );
  };
  getRouter() {
    return this.router;
  }
}
