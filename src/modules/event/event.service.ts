import { PrismaService } from "../prisma/prisma.service";
import { ApiError } from "../../utils/api-error";
import { generateSlug } from "../../utils/generateSlug";
import { injectable } from "tsyringe";
import { EventDTO } from "./dto/event.dto";
import { CategoryName, Location, Prisma } from "../../generated/prisma";
import { GetEventsDTO } from "./dto/get-events.dto";
import { CloudinaryService } from "../cloudinary/cloudinary.service";
import { UpdateEventDTO } from "./dto/update-event.dto";

@injectable()
export class EventService {
  private prisma: PrismaService;
  private cloudinaryService: CloudinaryService;

  constructor(
    PrismaClient: PrismaService,
    CloudinaryService: CloudinaryService
  ) {
    this.prisma = PrismaClient;
    this.cloudinaryService = CloudinaryService;
  }

  createEvent = async (body: EventDTO, picture: Express.Multer.File) => {
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

    const eventNew = await this.prisma.event.create({
      data: { ...body, slug: slug, thumbnail: secure_url },
    });

    return { message: "Created successfully", eventNew };
  };

  // DTO Data Transfer Object yang mendefinisikan struktur data yang diharapkan untuk parameter query
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
      // sortBy created at, sortOrder desc?
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
      include: { tickets: true, category: true, organizer: true },
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

  getEventsByCategory = async (slug: CategoryName, query: GetEventsDTO) => {
    const { page, take, sortBy, sortOrder, search } = query;

    const whereClause: Prisma.EventWhereInput = {
      isDeleted: false,
      category: { name: slug.toUpperCase() as CategoryName },
    };

    if (search) {
      whereClause.name = { contains: search, mode: "insensitive" };
    }

    const events = await this.prisma.event.findMany({
      where: whereClause,
      include: { tickets: true, organizer: true },
      orderBy: { [sortBy]: sortOrder },
      // sortBy created at, sortOrder desc?
      skip: (page - 1) * take,
      take,
    });

    const count = await this.prisma.event.count({ where: whereClause });
    return {
      data: events,
      meta: { page, take, total: count },
    };
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

  updateEvent = async (id: number, body: Partial<UpdateEventDTO>) => {
    const existingEvent = await this.prisma.event.findFirst({
      where: { id },
      include: { category: true },
    });

    if (!existingEvent) {
      throw new ApiError("Event not found", 404);
    }

    // Cek dan validasi nama baru
    if (body.name && body.name !== existingEvent.name) {
      const duplicate = await this.prisma.event.findFirst({
        where: { name: body.name },
      });

      if (duplicate && duplicate.id !== id) {
        throw new ApiError("Event name already exists", 400);
      }
    }

    // Generate slug jika nama berubah
    const updatedData: any = {
      name: body.name ?? existingEvent.name,
      desc: body.desc ?? existingEvent.desc,
      startDate: body.startDate ?? existingEvent.startDate,
      endDate: body.endDate ?? existingEvent.endDate,
      category: body.category ?? existingEvent.category.name,
      location: body.location ?? existingEvent.location,
    };

    if (body.name && body.name !== existingEvent.name) {
      updatedData.slug = generateSlug(body.name);
    }

    await this.prisma.event.update({
      where: { id },
      data: updatedData,
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
