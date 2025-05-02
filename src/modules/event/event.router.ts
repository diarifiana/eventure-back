import { Router } from "express";
import { injectable } from "tsyringe";
import { validateBody } from "../../middlewares/validation.middleware";
import { EventController } from "./event.controller";
import { EventDTO } from "./dto/event.dto";
import { verifyToken } from "../../lib/jwt";
import { verifyRole } from "../../middlewares/role.middleware";
import { JWT_SECRET_KEY } from "../../config";
import { JwtMiddleware } from "../../middlewares/jwt.middleware";

@injectable()
export class EventRouter {
  private router: Router;
  private eventController: EventController;
  private jwtMiddleware: JwtMiddleware;
  constructor(EventController: EventController, JwtMiddleware: JwtMiddleware) {
    this.router = Router();
    this.eventController = EventController;
    this.jwtMiddleware = JwtMiddleware;
    this.initializeRoutes();
  }

  private initializeRoutes = () => {
    this.router.post(
      "/",
      verifyToken,
      verifyRole(["ADMIN"]),
      validateBody(EventDTO),
      this.eventController.createEvent
    );

    this.router.get("/", this.eventController.getEvents);

    this.router.get("/:id", this.eventController.getEvent);

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
