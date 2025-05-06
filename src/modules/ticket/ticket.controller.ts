import { NextFunction, Request, Response } from "express";
import { injectable } from "tsyringe";
import { TicketService } from "./ticket.service";

@injectable()
export class TicketController {
  private ticketService: TicketService;

  constructor(TicketService: TicketService) {
    this.ticketService = TicketService;
  }

  createTicket = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body;
      const result = await this.ticketService.createTicket(body);
      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };
}
