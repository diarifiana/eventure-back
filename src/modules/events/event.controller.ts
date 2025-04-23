import { Location } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import { injectable } from "tsyringe";
import { EventService } from "./event.service";

@injectable()
export class EventController {
  private eventService: EventService;

  constructor(EventService: EventService) {
    this.eventService = EventService;
  }

  createEvent = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.eventService.createEventService(req.body);
      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };

  getEvents = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.eventService.getEventsService();
      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };

  getEvent = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.eventService.getEventService(
        Number(req.params.id)
      );
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
      const result = await this.eventService.getEventsByCategoryService(
        req.params.slug
      );

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
      const result = await this.eventService.getEventsByLocationService({
        location: req.params.slug as Location,
      });
      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };

  updateEvent = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.eventService.updateEventService(
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
      const result = await this.eventService.getEventsByOrganizerService(
        Number(req.params.id)
      );
      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };
}
