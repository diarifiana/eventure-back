import { Router } from "express";
import { injectable } from "tsyringe";
import { JWT_SECRET_KEY } from "../../config";
import { uploader } from "../../lib/multer";
import { JwtMiddleware } from "../../middlewares/jwt.middleware";
import { verifyRole } from "../../middlewares/role.middleware";
import { UploaderMiddleware } from "../../middlewares/uploader.middleware";
import { validateBody } from "../../middlewares/validation.middleware";
import { EventDTO } from "./dto/event.dto";
import { UpdateEventDTO } from "./dto/update-event.dto";
import { EventController } from "./event.controller";

@injectable()
export class EventRouter {
  private router: Router;
  private eventController: EventController;
  private jwtMiddleware: JwtMiddleware;
  private uploaderMiddleware: UploaderMiddleware;
  constructor(
    EventController: EventController,
    JwtMiddleware: JwtMiddleware,
    UploaderMiddleware: UploaderMiddleware
  ) {
    this.router = Router();
    this.eventController = EventController;
    this.jwtMiddleware = JwtMiddleware;
    this.uploaderMiddleware = UploaderMiddleware;
    this.initializeRoutes();
  }

  private initializeRoutes = () => {
    this.router.post(
      "/",
      this.jwtMiddleware.verifyToken(JWT_SECRET_KEY!),
      verifyRole(["ADMIN"]),
      uploader(1).fields([{ name: "thumbnail", maxCount: 1 }]),
      this.uploaderMiddleware.fileFilter([
        "image/jpeg",
        "image/avif",
        "image/png",
        "image/webp",
      ]),
      validateBody(EventDTO),
      this.eventController.createEvent
    );

    this.router.get("/", this.eventController.getEvents);

    // update event
    this.router.patch(
      "/:id",
      this.jwtMiddleware.verifyToken(JWT_SECRET_KEY!),
      verifyRole(["ADMIN"]),
      validateBody(UpdateEventDTO),
      this.eventController.updateEvent
    );

    // upload event thumbnail
    this.router.post(
      "/:id",
      this.jwtMiddleware.verifyToken(JWT_SECRET_KEY!),
      verifyRole(["ADMIN"]),
      uploader(1).fields([{ name: "thumbnail", maxCount: 1 }]),
      this.uploaderMiddleware.fileFilter([
        "image/jpeg",
        "image/avif",
        "image/png",
        "image/webp",
      ]),
      this.eventController.uploadEventThumbnail
    );

    this.router.get("/:slug", this.eventController.getEvent);

    this.router.get(
      "/organizer/:id",
      this.jwtMiddleware.verifyToken(JWT_SECRET_KEY!),
      verifyRole(["ADMIN"]),
      this.eventController.getEventsByOrganizer
    );

    this.router.get("/:id/tickets", this.eventController.getEventTickets);

    this.router.get(
      "/:id/attendees",
      verifyRole(["ADMIN"]),
      this.eventController.getEventAttendees
    );

    this.router.get(
      "/location/:slug",
      this.eventController.getEventsByLocation
    );

    this.router.delete(
      "/delete/:id",
      this.jwtMiddleware.verifyToken(JWT_SECRET_KEY!),
      verifyRole(["ADMIN"]),
      this.eventController.deleteEvent
    );
  };

  getRouter() {
    return this.router;
  }
}
