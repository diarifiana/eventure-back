import { Router } from "express";
import { injectable } from "tsyringe";
import { JWT_SECRET_KEY } from "../../config";
import { uploader } from "../../lib/multer";
import { JwtMiddleware } from "../../middlewares/jwt.middleware";
import { UploaderMiddleware } from "../../middlewares/uploader.middleware";
import { validateBody } from "../../middlewares/validation.middleware";
import { UpdateOrganizerDTO } from "./dto/update-organizer.dto";
import { OrganizerController } from "./organizer.controller";
import { verifyToken } from "../../lib/jwt";
import { verifyRole } from "../../middlewares/role.middleware";
import { UpdateBankDetailsDTO } from "./dto/update-bank-details.sto";
import { get } from "http";

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
      "/transactions",
      this.jwtMiddleware.verifyToken(JWT_SECRET_KEY!),
      verifyRole(["ADMIN"]),
      this.organizerController.getTranscationByOrganizer
    );

    this.router.get(
      "/transactions/event/:slug",
      this.jwtMiddleware.verifyToken(JWT_SECRET_KEY!),
      verifyRole(["ADMIN"]),
      this.organizerController.getTransactionPerEventSummary
    );

    this.router.get(
      "/transaction-stats",
      this.jwtMiddleware.verifyToken(JWT_SECRET_KEY!),
      verifyRole(["ADMIN"]),
      this.organizerController.getTransactionStatsByPeriod
    );

    this.router.get(
      "/transactions/:id",
      this.organizerController.getEventsForOrganizer
    );

    // this.router.get(
    //   "/events",
    //   this.jwtMiddleware.verifyToken(JWT_SECRET_KEY!),
    //   verifyRole(["ADMIN"]),
    //   this.organizerController.getEventByOrganizer
    // );

    this.router.get(
      "/events",
      this.jwtMiddleware.verifyToken(JWT_SECRET_KEY!),
      verifyRole(["ADMIN"]),
      this.organizerController.getOrganizerEvents
    );

    this.router.get(
      "/events/:slug",
      this.jwtMiddleware.verifyToken(JWT_SECRET_KEY!),
      verifyRole(["ADMIN"]),
      this.organizerController.getEventOrganizerBySlug
    );

    this.router.get(
      "/events/:slug",
      this.jwtMiddleware.verifyToken(JWT_SECRET_KEY!),
      verifyRole(["ADMIN"]),
      this.organizerController.getEventOrganizerBySlug
    );
    // getOrganizerByUserId
    this.router.get(
      "/:id",
      this.jwtMiddleware.verifyToken(JWT_SECRET_KEY!),
      this.organizerController.getOrganizerByUserId
    );

    // updateOrganizer
    this.router.patch(
      "/update",
      this.jwtMiddleware.verifyToken(JWT_SECRET_KEY!),
      validateBody(UpdateOrganizerDTO),
      verifyRole(["ADMIN"]),
      this.organizerController.updateOrganizer
    );

    this.router.patch(
      "/bank-details",
      this.jwtMiddleware.verifyToken(JWT_SECRET_KEY!),
      validateBody(UpdateBankDetailsDTO),
      verifyRole(["ADMIN"]),
      this.organizerController.updateBankDetails
    );

    // uploadOrganizerPic
    this.router.post(
      "/upload-organizer",
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

    this.router.get("/detail/:slug", this.organizerController.getOrganizer);
  };
  getRouter() {
    return this.router;
  }
}
