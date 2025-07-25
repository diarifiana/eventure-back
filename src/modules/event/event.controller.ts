import { plainToInstance } from "class-transformer";
import { NextFunction, Request, Response } from "express";
import { injectable } from "tsyringe";
import { CategoryName, Location } from "../../generated/prisma";
import { ApiError } from "../../utils/api-error";
import { EventDTO } from "./dto/event.dto";
import { GetEventsDTO } from "./dto/get-events.dto";
import { UpdateEventDTO } from "./dto/update-event.dto";
import { EventService } from "./event.service";

@injectable()
export class EventController {
  private eventService: EventService;

  constructor(EventService: EventService) {
    this.eventService = EventService;
  }

  createEvent = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const picture = files.thumbnail?.[0];
      const body = plainToInstance(EventDTO, req.body);

      const authUserId = res.locals.user.id as number;

      if (!files) {
        throw new ApiError("No files selected", 400);
      }

      const result = await this.eventService.createEvent(
        body,
        picture,
        authUserId
      );

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
        res.locals.user.id,
        plainToInstance(UpdateEventDTO, req.body)
      );

      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };

  uploadEventThumbnail = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const picture = files.thumbnail?.[0];
      const result = await this.eventService.uploadEventThumbnail(
        res.locals.user.id,
        Number(req.params.id),
        picture
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
      const result = await this.eventService.deleteEvent(
        res.locals.user.id,
        Number(req.params.id)
      );
      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };
}
