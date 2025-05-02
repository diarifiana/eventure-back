import { Router } from "express";
import { injectable } from "tsyringe";
import { JWT_SECRET_KEY } from "../../config";
import { uploader } from "../../lib/multer";
import { JwtMiddleware } from "../../middlewares/jwt.middleware";
import { UploaderMiddleware } from "../../middlewares/uploader.middleware";
import { validateBody } from "../../middlewares/validation.middleware";
import { UpdateOrganizerDTO } from "./dto/update-organizer.dto";
import { uploadOrganizerDTO } from "./dto/upload-organizer.dto";
import { OrganizerController } from "./organizer.controller";
import { verifyToken } from "../../lib/jwt";
import { verifyRole } from "../../middlewares/role.middleware";

@injectable()
export class OrganizerRouter {
  private router: Router;
  private organizerController: OrganizerController;
  private jwtMiddleware: JwtMiddleware;
  private uploaderMiddleware: UploaderMiddleware;

  constructor(
    OrganizerController: OrganizerController,
    JwtMiddleware: JwtMiddleware,
    UploaderMiddleware: UploaderMiddleware
  ) {
    this.router = Router();
    this.organizerController = OrganizerController;
    this.jwtMiddleware = JwtMiddleware;
    this.uploaderMiddleware = UploaderMiddleware;
    this.initializeRoutes();
  }

  private initializeRoutes = () => {
    // getEventsByOrganizer
    this.router.get(
      "/events",
      this.jwtMiddleware.verifyToken(JWT_SECRET_KEY!),
      verifyRole(["ADMIN"]),
      this.organizerController.getEventByOrganizer
    );

    this.router.get(
      "/:id",
      this.jwtMiddleware.verifyToken(JWT_SECRET_KEY!),
      this.organizerController.getOrganizerByUserId
    );

    // updateOrganizer
    this.router.patch(
      "/update",
      validateBody(UpdateOrganizerDTO),
      this.jwtMiddleware.verifyToken(JWT_SECRET_KEY!),
      verifyRole(["ADMIN"]),
      this.organizerController.updateOrganizer
    );

    // uploadOrganizerPic
    this.router.post(
      "/upload-organizer-picture",
      verifyToken,
      this.uploaderMiddleware.fileFilter([
        "image/jpeg",
        "image/avif",
        "image/png",
        "image/webp",
      ]),
      uploader(1).fields([{ name: "profilePic", maxCount: 1 }]),
      this.organizerController.uploadOrganizerPic
    );

    // getTransactionByOrganizer
  };
  getRouter() {
    return this.router;
  }
}
