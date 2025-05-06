import { injectable } from "tsyringe";
import { ApiError } from "../../utils/api-error";

import { PrismaService } from "../prisma/prisma.service";
import { CloudinaryService } from "../cloudinary/cloudinary.service";
import { UpdateOrganizerDTO } from "./dto/update-organizer.dto";
import { JWT_SECRET_KEY } from "../../config";
import { TokenService } from "../auth/token.service";
import { Status } from "../../generated/prisma";

@injectable()
export class OrganizerService {
  private prisma: PrismaService;
  private cloudinaryService: CloudinaryService;
  private tokenService: TokenService;

  constructor(
    PrismaClient: PrismaService,
    CloudinaryService: CloudinaryService,
    TokenService: TokenService
  ) {
    this.prisma = PrismaClient;
    this.cloudinaryService = CloudinaryService;
    this.tokenService = TokenService;
  }

  getOrganizerByUserId = async (authUserId: number) => {
    const user = await this.prisma.user.findUnique({
      where: { id: authUserId },
      include: {
        organizer: true, // include relasi ke organizer
      },
    });

    const organizer = user?.organizer;
    if (!organizer) {
      throw new ApiError("User does not have an organizer", 404);
    }

    return organizer;
  };

  uploadOrganizerPic = async (
    authUserId: number,
    profilePic: Express.Multer.File
  ) => {
    const user = await this.prisma.user.findUnique({
      where: { id: authUserId },
      include: { organizer: true },
    });

    if (!user) {
      throw new ApiError("Invalid user id", 404);
    }

    if (user.isDeleted) {
      throw new ApiError("User already deleted", 400);
    }

    const organizer = user.organizer;

    if (!organizer) {
      throw new ApiError("User does not have an organizer", 400);
    }

    // Upload ke Cloudinary
    const { secure_url } = await this.cloudinaryService.upload(profilePic);
    console.log(secure_url);

    const updatedOrganizer = await this.prisma.organizer.update({
      where: { id: organizer.id },
      data: { profilePic: secure_url },
    });

    return {
      message: "Organizer profile picture uploaded successfully",
      data: updatedOrganizer,
    };
  };

  updateOrganizer = async (
    authUserId: number,
    body: Partial<UpdateOrganizerDTO>
  ) => {
    const user = await this.prisma.user.findUnique({
      where: { id: authUserId },
      include: {
        organizer: true, // include relasi ke organizer
      },
    });
    const organizer = user?.organizer;
    if (!user) {
      throw new ApiError("Invalid user id", 404);
    }

    if (!organizer) {
      throw new ApiError("User does not have an organizer", 400);
    }
    const updatedOrganizer = await this.prisma.organizer.update({
      where: { id: organizer.id },
      data: body,
    });

    return {
      data: updatedOrganizer,
      message: "Data organizer updated successfully",
    };
  };

  getEventByOrganizer = async (authUserId: number) => {
    const user = await this.prisma.user.findUnique({
      where: { id: authUserId, deletedAt: null },
      include: {
        organizer: true,
      },
    });

    if (!user) {
      throw new ApiError("User not found", 404);
    }

    if (!user.organizer) {
      throw new ApiError("You are not registered as an organizer", 403);
    }

    const organizerId = user.organizer.id;

    const events = await this.prisma.event.findMany({
      where: {
        organizerId,
        isDeleted: false,
      },
      include: {
        organizer: true,
        tickets: {
          include: {
            transactions: true,
          },
        },
      },
    });
    const eventsWithTransactionCount = events.map((event) => {
      const totalTransactions = event.tickets.reduce(
        (acc, ticket) => acc + ticket.transactions.length,
        0
      );

      return {
        ...event,
        totalTransactions,
      };
    });

    return {
      message: "Here list of events",
      data: eventsWithTransactionCount,
    };
  };

  getTranscationByOrganizer = async (authUserId: number, status?: string) => {
    const user = await this.prisma.user.findUnique({
      where: { id: authUserId },
      include: {
        organizer: true,
      },
    });

    if (!user?.organizer) {
      throw new ApiError("You don't have an organizer", 404);
    }

    const organizerId = user.organizer.id;
    const parsedStatus = Object.values(Status).includes(status as Status)
      ? (status as Status)
      : undefined;
    const baseWhere = {
      ticket: {
        event: { organizerId },
      },
      isDeleted: false,
      ...(parsedStatus ? { status: parsedStatus } : {}),
    };
    const [transactions, totalTransaction, totalTicketQty] = await Promise.all([
      this.prisma.transaction.findMany({
        where: baseWhere,
        include: {
          ticket: { include: { event: true } },
          user: true,
          transactionDetails: true,
        },
      }),
      this.prisma.transaction.aggregate({
        where: baseWhere,
        _count: { uuid: true },
        _sum: { totalAmount: true },
      }),
      this.prisma.transactionDetail.aggregate({
        where: {
          transaction: {
            ...baseWhere,
          },
        },
        _sum: { qty: true },
      }),
    ]);

    return {
      transactions,
      totalCount: totalTransaction._count?.uuid ?? 0,
      totalRevenue: totalTransaction._sum?.totalAmount ?? 0,
      totalTicket: totalTicketQty._sum?.qty ?? 0,
    };
  };

  getEventsForOrganizer = async (authUserId: number) => {
    const organizer = await this.prisma.organizer.findFirst({
      where: { userId: authUserId },
    });

    if (!organizer) {
      throw new ApiError("Organizer not found", 400);
    }

    const transactions = await this.prisma.transaction.findMany({
      where: {
        transactionDetails: {
          some: {
            ticket: {
              event: {
                organizerId: organizer.id,
              },
            },
          },
        },
      },
    });

    return transactions;
  };

  getEventOrganizerBySlug = async (authUserId: number, slug: string) => {
    const user = await this.prisma.user.findUnique({
      where: { id: authUserId },
      include: {
        organizer: true,
      },
    });

    if (!user) {
      throw new ApiError("User not found", 404);
    }

    if (!user.organizer) {
      throw new ApiError("You are not registered as an organizer", 403);
    }

    const event = await this.prisma.event.findUnique({
      where: { slug },
      include: {
        organizer: true,
      },
    });

    if (!event) {
      throw new ApiError("Event not found", 404);
    }

    return event;
  };

  getEventTransactionByOrganizer = async (authUserId: number, slug: string) => {
    const user = await this.prisma.user.findUnique({
      where: { id: authUserId },
      include: {
        organizer: true,
      },
    });

    if (!user?.organizer) {
      throw new ApiError("You don't have an organizer", 404);
    }
  };

  getTransactionPerEventSummary = async (
    authUserId: number,
    eventSlug?: string
  ) => {
    const user = await this.prisma.user.findUnique({
      where: { id: authUserId },
      include: { organizer: true },
    });

    if (!user?.organizer)
      throw new ApiError("You don't have an organizer", 404);

    const organizerId = user.organizer.id;

    const eventFilter = eventSlug
      ? { slug: eventSlug, organizerId }
      : { organizerId };

    const event = eventSlug
      ? await this.prisma.event.findFirst({
          where: { ...eventFilter, isDeleted: false },
        })
      : null;

    const baseWhere = eventSlug
      ? { ticket: { eventId: event?.id } }
      : {
          ticket: {
            event: {
              organizerId,
              isDeleted: false,
            },
          },
        };

    const doneWhere = {
      ...baseWhere,
      status: "DONE" as const,
      isDeleted: false,
    };

    const baseWhereWithIsDeleted = {
      ...baseWhere,
      isDeleted: false,
    };

    const [transactions, totalTransaction, totalRevenue, totalTicketQty] =
      await Promise.all([
        this.prisma.transaction.findMany({
          where: baseWhereWithIsDeleted,
          include: {
            ticket: { include: { event: true } },
            user: true,
            transactionDetails: true,
          },
        }),
        this.prisma.transaction.aggregate({
          where: baseWhereWithIsDeleted, // ✅ Hitung semua transaksi
          _count: { uuid: true },
        }),
        this.prisma.transaction.aggregate({
          where: doneWhere, // ✅ Revenue hanya dari yang DONE
          _sum: { totalAmount: true },
        }),
        this.prisma.transactionDetail.aggregate({
          where: {
            transaction: doneWhere, // ✅ Tiket hanya dari transaksi DONE
          },
          _sum: { qty: true },
        }),
      ]);

    return {
      transactions, // ✅ Semua transaksi (DONE, REJECTED, dll)
      totalCount: totalTransaction._count.uuid,
      totalRevenue: totalRevenue._sum.totalAmount || 0,
      totalTicket: totalTicketQty._sum.qty || 0,
    };
  };

  getOrganizer = async (slug: string) => {
    const organizer = await this.prisma.organizer.findFirst({
      where: { slug },
      include: { events: true },
    });

    if (!organizer) {
      throw new ApiError("Organizer not found", 400);
    }

    return organizer;
  };
}
