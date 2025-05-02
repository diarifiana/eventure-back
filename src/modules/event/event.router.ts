import { Router } from "express";
import { injectable } from "tsyringe";
import { validateBody } from "../../middlewares/validation.middleware";
import { EventController } from "./event.controller";
import { EventDTO } from "./dto/event.dto";
import { verifyToken } from "../../lib/jwt";
import { verifyRole } from "../../middlewares/role.middleware";
import { UploaderMiddleware } from "../../middlewares/uploader.middleware";
import { uploader } from "../../lib/multer";
import { JWT_SECRET_KEY } from "../../config";
import { JwtMiddleware } from "../../middlewares/jwt.middleware";

@injectable()
export class EventRouter {
  private router: Router;
  private eventController: EventController;
  private uploaderMiddleware: UploaderMiddleware;
  private jwtMiddleware: JwtMiddleware;
  constructor(
    EventController: EventController,
    UploaderMiddleware: UploaderMiddleware,
    JwtMiddleware: JwtMiddleware
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
      verifyToken,
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
      "/category/:slug",
      this.eventController.getEventsByCategory
    );

    this.router.get(
      "/location/:slug",
      this.eventController.getEventsByLocation
    );

    this.router.patch(
      "/:id",
      verifyToken,
      verifyRole(["ADMIN"]),
      validateBody(EventDTO),
      this.eventController.updateEvent
    );

    this.router.delete(
      "/:id",
      verifyToken,
      verifyRole(["ADMIN"]),
      validateBody(EventDTO),
      this.eventController.updateEvent
    );
  };

  getRouter() {
    return this.router;
  }
}
