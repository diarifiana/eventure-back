import { injectable } from "tsyringe";
import { CategoryName, Location, Prisma } from "../../generated/prisma";
import { ApiError } from "../../utils/api-error";
import { generateSlug } from "../../utils/generateSlug";
import { CloudinaryService } from "../cloudinary/cloudinary.service";
import { PrismaService } from "../prisma/prisma.service";
import { EventDTO } from "./dto/event.dto";
import { GetEventsDTO } from "./dto/get-events.dto";
import { UpdateEventDTO } from "./dto/update-event.dto";

@injectable()
export class EventService {
  private prisma: PrismaService;
  private cloudinaryService: CloudinaryService;

  constructor(
    PrismaClient: PrismaService,
    CloudinaryService: CloudinaryService
  ) {
    console.log("Constructing EventService");

    this.prisma = PrismaClient;
    this.cloudinaryService = CloudinaryService;
  }

  createEvent = async (
    body: EventDTO,
    picture: Express.Multer.File,
    authUserId: number
  ) => {
    const organizer = await this.prisma.organizer.findFirst({
      where: { userId: authUserId },
    });

    if (!organizer || organizer.userId !== authUserId) {
      throw new ApiError("Unauthorized", 401);
    }

    const existing = await this.prisma.event.findFirst({
      where: { name: body.name },
    });

    if (existing) {
      throw new ApiError("Event already exist", 400);
    }

    const slug = generateSlug(body.name);

    // cloudinary
    const { secure_url } = await this.cloudinaryService.upload(picture);
    console.log(body);

    const newEvent = await this.prisma.event.create({
      data: {
        ...body,
        slug: slug,
        thumbnail: secure_url,
        organizerId: organizer.id,
      },
    });

    return { message: "Created successfully", newEvent };
  };

  getEvents = async (query: GetEventsDTO) => {
    const { page, take, sortBy, sortOrder, search, category } = query;

    const whereClause: Prisma.EventWhereInput = {
      isDeleted: false,
    };

    if (search) {
      whereClause.name = { contains: search, mode: "insensitive" };
    }

    if (category) {
      whereClause.category = category;
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
    const data = await this.prisma.event.findUnique({
      where: { slug },
      include: { tickets: true, organizer: true },
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

  getEventsByLocation = async (location: Location, query: GetEventsDTO) => {
    const { page, take, sortBy, sortOrder, search } = query;

    const whereClause: Prisma.EventWhereInput = {
      isDeleted: false,
      location: location,
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

  updateEvent = async (
    id: number,
    authUserId: number,
    body: Partial<UpdateEventDTO>
  ) => {
    const existingEvent = await this.prisma.event.findFirst({
      where: { id },
      include: { organizer: { include: { user: true } } },
    });

    if (!existingEvent) {
      throw new ApiError("Event not found", 404);
    }

    if (existingEvent.organizer.user.id !== authUserId) {
      throw new ApiError("You are not authorized", 401);
    }

    let newSlug = existingEvent.slug;

    if (body.name && body.name !== existingEvent.name) {
      const duplicate = await this.prisma.event.findFirst({
        where: { name: body.name },
      });

      if (duplicate && duplicate.id !== id) {
        throw new ApiError("Event name already exists", 400);
      }

      newSlug = generateSlug(body.name);
    }

    return await this.prisma.event.update({
      where: { id },
      data: {
        ...body,
        slug: newSlug,
      },
    });
  };

  uploadEventThumbnail = async (
    authUserId: number,
    id: number,
    thumbnail: Express.Multer.File
  ) => {
    const existingEvent = await this.prisma.event.findFirst({
      where: { id },
      include: { organizer: { include: { user: true } } },
    });

    if (!existingEvent) {
      throw new ApiError("Event not found", 404);
    }

    if (existingEvent.organizer.user.id !== authUserId) {
      throw new ApiError("You are not authorized", 401);
    }
    if (existingEvent.thumbnail) {
      await this.cloudinaryService.remove(existingEvent.thumbnail);
    }
    const { secure_url } = await this.cloudinaryService.upload(thumbnail);
    await this.prisma.event.update({
      where: { id },
      data: {
        thumbnail: secure_url,
      },
    });
    return {
      data: secure_url,
      message: `success upload thumbnail ${secure_url}`,
    };
  };

  deleteEvent = async (authUserId: number, id: number) => {
    const user = await this.prisma.user.findUnique({
      where: { id: authUserId },
    });
    if (!user) {
      throw new ApiError("User not found", 404);
    }

    const organizer = await this.prisma.organizer.findFirst({
      where: {
        userId: authUserId,
      },
    });

    if (!organizer) {
      throw new ApiError("Organizer not found", 404);
    }

    const event = await this.prisma.event.findFirst({
      where: { id },
    });

    if (!event) {
      throw new ApiError("Event not found", 404);
    }

    if (event.organizerId !== organizer.id) {
      throw new ApiError("Unauthorized to delete this event", 403);
    }

    await this.cloudinaryService.remove(event.thumbnail);

    await this.prisma.event.update({
      where: { id },
      data: {
        isDeleted: true,
      },
    });
    return {
      message: "success delete event",
    };
  };
}
