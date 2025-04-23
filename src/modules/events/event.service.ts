import { PrismaService } from "../prisma/prisma.service";
import { ApiError } from "../../utils/api-error";
import { generateSlug } from "../../utils/generateSlug";
import { injectable } from "tsyringe";
import { EventDTO } from "./dto/event.dto";

@injectable()
export class EventService {
  private prisma: PrismaService;

  constructor(PrismaClient: PrismaService) {
    this.prisma = PrismaClient;
  }

  createEventService = async (body: EventDTO) => {
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

  getEventsByOrganizerService = async (organizerId: number) => {
    const events = await this.prisma.event.findMany({
      where: { organizerId, isDeleted: false },
    });
    if (!events) {
      throw new Error("Event not found");
    }
    return events;
  };

  getEventService = async (id: number) => {
    const data = await this.prisma.event.findFirst({
      where: { id },
    });

    if (!data) {
      throw new ApiError("Not found", 404);
    }

    return data;
  };

  getEventsByCategoryService = async (category: string) => {
    const data = await this.prisma.event.findMany({
      where: {
        category: {
          name: category,
        },
      },
    });

    return data;
  };

  getEventsByLocationService = async (body: Pick<EventDTO, "location">) => {
    return await this.prisma.event.findMany({
      where: { location: body.location },
    });
  };

  getEventsService = async () => {
    return await this.prisma.event.findMany({
      orderBy: {
        createdAt: "asc",
      },
    });
  };

  updateEventService = async (id: number, body: Partial<EventDTO>) => {
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
}
