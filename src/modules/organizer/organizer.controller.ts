import { NextFunction, Request, Response } from "express";
import { injectable } from "tsyringe";
import { ApiError } from "../../utils/api-error";
import { OrganizerService } from "./organizer.service";
import { Status } from "../../generated/prisma";
import { plainToInstance } from "class-transformer";
import { GetEventsDTO } from "./dto/get-event.dto";
import { GetTransactionsDTO } from "./dto/get-transactions.dto";

@injectable()
export class OrganizerController {
  private organizerService: OrganizerService;

  constructor(OrganizerService: OrganizerService) {
    this.organizerService = OrganizerService;
  }

  getOrganizerByUserId = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const userId = res.locals.user?.id;
      const organizer = await this.organizerService.getOrganizerByUserId(
        userId
      );
      res.status(200).send(organizer);
    } catch (error) {
      next(error);
    }
  };

  uploadOrganizerPic = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const files = req.files as { [fields: string]: Express.Multer.File[] };
      const picture = files.profilePic?.[0];

      const userId = res.locals.user.id;

      if (!files || !picture) {
        throw new ApiError("Please upload a profile picture", 400);
      }
      // console.log(files);

      const result = await this.organizerService.uploadOrganizerPic(
        userId,
        picture
      );

      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };

  updateOrganizer = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.organizerService.updateOrganizer(
        res.locals.user.id,
        req.body
      );
      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };
  updateBankDetails = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const result = await this.organizerService.updateBankDetails(
        res.locals.user.id,
        req.body
      );
      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };

  getEventByOrganizer = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const result = await this.organizerService.getEventByOrganizer(
        res.locals.user.id
      );
      // console.log("AUTH USER:", res.locals.user);
      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };

  getOrganizerEvents = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const query = plainToInstance(GetEventsDTO, req.query);
      const result = await this.organizerService.getOrganizerEvents(
        res.locals.user.id,
        query
      );
      // console.log("AUTH USER:", res.locals.user);
      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };

  getEventOrganizerBySlug = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const result = await this.organizerService.getEventOrganizerBySlug(
        res.locals.user.id,
        req.params.slug
      );
      // console.log("AUTH USER:", res.locals.user);
      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };

  getTransactionPerEventSummary = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const result = await this.organizerService.getTransactionPerEventSummary(
        res.locals.user.id,
        req.params.slug
      );
      // console.log("AUTH USER:", res.locals.user);
      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };

  getTranscationByOrganizer = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const query = plainToInstance(GetTransactionsDTO, req.query);

      const statusQuery = req.query.status as string | undefined;
      const result = await this.organizerService.getTranscationByOrganizer(
        res.locals.user.id,
        query,
        statusQuery
      );
      // console.log("AUTH USER:", res.locals.user);
      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };

  getTransactionStatsByPeriod = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      // const statusQuery = req.query.status as string | undefined;
      const { period, status } = req.query;
      const result = await this.organizerService.getTransactionStatsByPeriod(
        res.locals.user.id,
        period as string,
        status as string
      );
      // console.log("AUTH USER:", res.locals.user);
      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };
}
