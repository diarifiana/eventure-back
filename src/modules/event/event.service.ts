import { PrismaService } from "../prisma/prisma.service";
import { ApiError } from "../../utils/api-error";
import { generateSlug } from "../../utils/generateSlug";
import { injectable } from "tsyringe";
import { EventDTO } from "./dto/event.dto";
import { CategoryName, Prisma } from "../../generated/prisma";
import { GetEventsDTO } from "./dto/get-events.dto";

@injectable()
export class EventService {
  private prisma: PrismaService;

  constructor(PrismaClient: PrismaService) {
    this.prisma = PrismaClient;
  }

  createEvent = async (body: EventDTO) => {
    const existing = await this.prisma.event.findFirst({
      where: { name: body.name },
    });

    if (existing) {
      throw new ApiError("Event already exist", 400);
    }

    const slug = generateSlug(body.name);

    const eventNew = await this.prisma.event.create({
      data: { ...body, slug },
    });

    return { message: "Created successfully", eventNew };
  };

  getEvents = async (query: GetEventsDTO) => {
    const { page, take, sortBy, sortOrder, search } = query;

    const whereClause: Prisma.EventWhereInput = {
      isDeleted: false,
    };

    if (search) {
      whereClause.name = { contains: search, mode: "insensitive" };
    }

    const events = await this.prisma.event.findMany({
      where: whereClause,
      include: { tickets: true, organizer: true },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * take,
      take,
    });

    const count = await this.prisma.event.count({ where: whereClause });
    return {
      data: events,
      meta: { page, take, total: count },
    };
  };

  getEvent = async (slug: string) => {
    const data = await this.prisma.event.findFirst({
      where: { slug },
    });

    if (!data) {
      throw new ApiError("Not found", 404);
    }

    return data;
  };

  getEventsByOrganizer = async (organizerId: number) => {
    const events = await this.prisma.event.findMany({
      where: { organizerId, isDeleted: false },
    });
    if (!events) {
      throw new Error("Event not found");
    }
    return events;
  };

  getEventsByCategory = async (category: CategoryName) => {
    const data = await this.prisma.event.findMany({
      where: {
        category: {
          name: category,
        },
      },
    });

    return data;
  };

  getEventsByLocation = async (body: Pick<EventDTO, "location">) => {
    return await this.prisma.event.findMany({
      where: { location: body.location },
    });
  };

  getEventTickets = async (id: number) => {
    const tickets = await this.prisma.event.findMany({
      where: { id },
      select: { tickets: true },
    });

    return tickets;
  };

  getEventAttendees = async (id: number) => {
    const attendee = await this.prisma.event.findFirst({
      where: { id },
      select: {
        tickets: {
          select: {
            transactions: {
              select: {
                user: { select: { id: true, fullName: true, email: true } },
              },
            },
          },
        },
      },
    });

    return attendee?.tickets[0].transactions;
  };

  updateEvent = async (id: number, body: Partial<EventDTO>) => {
    const event = await this.prisma.event.findFirst({
      where: { id: id },
    });
    if (!event) {
      throw new ApiError("Event not found", 404);
    }

    if (body.name) {
      const existingEvent = await this.prisma.event.findFirst({
        where: { name: body.name },
      });
      if (existingEvent && existingEvent.id !== id) {
        throw new ApiError("Product name already exists", 400);
      }
      body.slug = generateSlug(body.name);
    }

    await this.prisma.event.update({
      where: { id: id },
      data: body,
    });
    return { message: "Updated successfully" };
  };

  deleteEvent = async (id: number) => {
    const event = await this.prisma.event.findFirst({
      where: { id },
    });

    if (!event) {
      throw new ApiError("Not found", 400);
    }

    await this.prisma.event.update({
      where: { id: id },
      data: {
        isDeleted: true,
      },
    });
  };
}
