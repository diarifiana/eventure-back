import { injectable } from "tsyringe";
import { PrismaService } from "../prisma/prisma.service";
import { CreateTicketDTO } from "./dto/createTicket.dto";

@injectable()
export class TicketService {
  private prisma: PrismaService;

  constructor(PrismaClient: PrismaService) {
    this.prisma = PrismaClient;
  }

  createTicket = async (body: CreateTicketDTO) => {
    const data = await this.prisma.ticket.create({
      data: {
        eventName: body.eventName,
        ticketType: body.ticketType,
        price: body.price,
        qty: body.qty,
      },
    });

    return { message: "Create ticket success", data };
  };
}
