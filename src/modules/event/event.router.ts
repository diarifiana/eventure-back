import { Router } from "express";
import { injectable } from "tsyringe";
import { validateBody } from "../../middlewares/validation.middleware";
import { EventController } from "./event.controller";
import { EventDTO } from "./dto/event.dto";
import { verifyToken } from "../../lib/jwt";
import { verifyRole } from "../../middlewares/role.middleware";

@injectable()
export class EventRouter {
  private router: Router;
  private eventController: EventController;

  constructor(EventController: EventController) {
    this.router = Router();
    this.eventController = EventController;
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
