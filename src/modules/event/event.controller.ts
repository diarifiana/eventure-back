import { NextFunction, Request, Response } from "express";
import { injectable } from "tsyringe";
import { EventService } from "./event.service";
import { plainToInstance } from "class-transformer";
import { GetEventsDTO } from "./dto/get-events.dto";
import { CategoryName, Location } from "../../generated/prisma";
import { ApiError } from "../../utils/api-error";
import { UploaderMiddleware } from "../../middlewares/uploader.middleware";
import { EventDTO } from "./dto/event.dto";

@injectable()
export class EventController {
  private eventService: EventService;
  private uploaderMiddleware: UploaderMiddleware;

  constructor(
    EventService: EventService,
    UploaderMiddleware: UploaderMiddleware
  ) {
    this.eventService = EventService;
    this.uploaderMiddleware = UploaderMiddleware;
  }

  createEvent = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const picture = files.thumbnail?.[0];
      const body = plainToInstance(EventDTO, req.body);

      // const userId = res.locals.user?.id;

      if (!files) {
        throw new ApiError("No files selected", 400);
      }

      const result = await this.eventService.createEvent(body, picture);

      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };

  getEvents = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = plainToInstance(GetEventsDTO, req.query);
      const result = await this.eventService.getEvents(query);
      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };

  getEvent = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const slug = req.params.slug;
      const result = await this.eventService.getEvent(slug);
      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };

  getEventsByCategory = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const slug = req.params.slug as CategoryName;
      const query = plainToInstance(GetEventsDTO, req.query);
      const result = await this.eventService.getEventsByCategory(slug, query);

      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };

  getEventsByLocation = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const query = plainToInstance(GetEventsDTO, req.query);
      const slug = req.params.slug as Location;
      const result = await this.eventService.getEventsByLocation(slug, query);
      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };

  getEventTickets = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.eventService.getEventTickets(
        Number(req.params.id)
      );
      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };

  getEventAttendees = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const result = await this.eventService.getEventAttendees(
        Number(req.params.id)
      );
      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };

  updateEvent = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.eventService.updateEvent(
        Number(req.params.id),
        req.body
      );
      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };

  getEventsByOrganizer = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const result = await this.eventService.getEventsByOrganizer(
        Number(req.params.id)
      );
      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };

  deleteEvent = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.eventService.deleteEvent(Number(req.params.id));
      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };
}
