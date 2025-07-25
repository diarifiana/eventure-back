import { injectable } from "tsyringe";
import { ApiError } from "../../utils/api-error";

import { PrismaService } from "../prisma/prisma.service";
import { CloudinaryService } from "../cloudinary/cloudinary.service";
import { UpdateOrganizerDTO } from "./dto/update-organizer.dto";
import { JWT_SECRET_KEY } from "../../config";
import { TokenService } from "../auth/token.service";
import { Prisma, Status } from "../../generated/prisma";
import { GetEventsDTO } from "./dto/get-event.dto";
import { UpdateBankDetailsDTO } from "./dto/update-bank-details.sto";
import { GetTransactionsDTO } from "./dto/get-transactions.dto";

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
        organizer: true,
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

    const { secure_url } = await this.cloudinaryService.upload(profilePic);
    console.log(secure_url);

    const updatedOrganizer = await this.prisma.organizer.update({
      where: { id: organizer.id },
      data: { profilePic: secure_url },
    });

    return {
      message: "Organizer profile picture uploaded successfully",
      data: secure_url,
    };
  };

  updateOrganizer = async (
    authUserId: number,
    body: Partial<UpdateOrganizerDTO>
  ) => {
    const user = await this.prisma.user.findUnique({
      where: { id: authUserId },
      include: {
        organizer: true,
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

  getTranscationByOrganizer = async (
    authUserId: number,
    query: GetTransactionsDTO,
    status?: string
  ) => {
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
    const { search, take, page, sortBy, sortOrder } = query;

    const parsedStatus = Object.values(Status).includes(status as Status)
      ? (status as Status)
      : undefined;

    const baseWhere: Prisma.TransactionWhereInput = {
      transactionDetails: {
        some: {
          ticket: {
            event: {
              organizerId,
            },
          },
        },
      },
      isDeleted: false,
      ...(parsedStatus ? { status: parsedStatus } : {}),
      // Add search functionality for both event name and user email
      ...(search
        ? {
            OR: [
              {
                // Search by event name
                transactionDetails: {
                  some: {
                    ticket: {
                      event: {
                        name: {
                          contains: search,
                          mode: "insensitive",
                        },
                      },
                    },
                  },
                },
              },
              {
                // Search by user email
                user: {
                  email: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [transactions, totalTransaction, totalTicketQty, count] =
      await Promise.all([
        this.prisma.transaction.findMany({
          where: baseWhere,
          include: {
            user: true,
            transactionDetails: {
              include: {
                ticket: {
                  include: {
                    event: true,
                  },
                },
              },
            },
            voucher: true,
            referralCoupon: true,
          },
          orderBy: {
            [sortBy]: sortOrder,
          },
          take,
          skip: take * (page - 1),
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
        this.prisma.transaction.count({
          where: baseWhere,
        }),
      ]);
    const totalTransactions = totalTransaction._count?.uuid ?? 0;
    const totalRevenue = totalTransaction._sum?.totalAmount ?? 0;
    const totalTicket = totalTicketQty._sum?.qty ?? 0;

    return {
      data: { transactions, totalTransactions, totalRevenue, totalTicket },
      meta: {
        page,
        take,
        total: count,
      },
    };
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

    let event = null;
    if (eventSlug) {
      event = await this.prisma.event.findFirst({
        where: {
          slug: eventSlug,
          organizerId,
          isDeleted: false,
        },
        include: {
          tickets: true,
        },
      });

      if (!event) {
        throw new ApiError("Event not found", 404);
      }
    }

    const ticketsForEvent = await this.prisma.ticket.findMany({
      where: eventSlug
        ? { event: { slug: eventSlug } }
        : { event: { organizerId } },
      take: 5,
    });

    if (ticketsForEvent.length > 0) {
      const ticketIds = ticketsForEvent.map((t) => t.id);

      const transactionDetailsForTickets =
        await this.prisma.transactionDetail.findMany({
          where: {
            ticketId: { in: ticketIds },
          },
          include: {
            transaction: true,
          },
          take: 5,
        });
    }

    let baseWhere;

    if (eventSlug && event) {
      const eventTickets = await this.prisma.ticket.findMany({
        where: { event: { slug: eventSlug } },
        select: { id: true },
      });

      const ticketIds = eventTickets.map((t) => t.id);

      if (ticketIds.length === 0) {
        return {
          transactions: [],
          totalTransactions: 0,
          totalRevenue: 0,
          totalTicket: 0,
        };
      }

      // Query based on ticket IDs
      baseWhere = {
        OR: [
          // Direct ticket relation
          { ticketId: { in: ticketIds } },
          // Through transaction details
          {
            transactionDetails: {
              some: {
                ticketId: { in: ticketIds },
              },
            },
          },
        ],
        isDeleted: false,
      };
    } else {
      // All events for this organizer
      const organizerEventIds = await this.prisma.event.findMany({
        where: { organizerId, isDeleted: false },
        select: { id: true },
      });

      const eventIds = organizerEventIds.map((e) => e.id);

      if (eventIds.length === 0) {
        // Return empty result if no events found
        return {
          transactions: [],
          totalTransactions: 0,
          totalRevenue: 0,
          totalTicket: 0,
        };
      }

      // Get all tickets for these events
      const eventTickets = await this.prisma.ticket.findMany({
        where: { event: { id: { in: eventIds } } },
        select: { id: true },
      });

      const ticketIds = eventTickets.map((t) => t.id);

      if (ticketIds.length === 0) {
        // Return empty result if no tickets found
        return {
          transactions: [],
          totalTransactions: 0,
          totalRevenue: 0,
          totalTicket: 0,
        };
      }

      // Query based on ticket IDs
      baseWhere = {
        OR: [
          // Direct ticket relation
          { ticketId: { in: ticketIds } },
          // Through transaction details
          {
            transactionDetails: {
              some: {
                ticketId: { in: ticketIds },
              },
            },
          },
        ],
        isDeleted: false,
      };
    }

    const doneWhere = {
      ...baseWhere,
      status: "DONE" as const,
    };

    const [transactions, totalTransactions, totalRevenue, totalTicketQty] =
      await Promise.all([
        this.prisma.transaction.findMany({
          where: baseWhere,
          include: {
            user: true,
            transactionDetails: {
              include: {
                ticket: {
                  include: {
                    event: true,
                  },
                },
              },
            },
            ticket: {
              include: {
                event: true,
              },
            },
            voucher: true,
            referralCoupon: true,
          },
        }),
        this.prisma.transaction.aggregate({
          where: baseWhere,
          _count: { uuid: true },
        }),
        this.prisma.transaction.aggregate({
          where: doneWhere,
          _sum: { totalAmount: true },
        }),
        this.prisma.transactionDetail.aggregate({
          where: {
            transaction: doneWhere,
          },
          _sum: { qty: true },
        }),
      ]);

    return {
      transactions,
      totalTransactions: totalTransactions._count.uuid,
      totalRevenue: totalRevenue._sum.totalAmount || 0,
      totalTicket: totalTicketQty._sum.qty || 0,
    };
  };

  getTransactionStatsByPeriod = async (
    authUserId: number,
    period?: string,
    status?: string
  ) => {
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

    const validPeriods = ["daily", "weekly", "monthly", "yearly"];
    const selectedPeriod =
      period && validPeriods.includes(period) ? period : "monthly";

    const now = new Date();
    let startDate = new Date();

    switch (selectedPeriod) {
      case "daily":
        startDate.setDate(now.getDate() - 30);
        break;
      case "weekly":
        startDate.setDate(now.getDate() - 84);
        break;
      case "monthly":
        startDate.setMonth(now.getMonth() - 6);
        break;
      case "yearly":
        startDate.setFullYear(now.getFullYear() - 5);
        break;
    }

    const transactions = await this.prisma.transaction.findMany({
      where: {
        transactionDetails: {
          some: {
            ticket: {
              event: {
                organizerId,
              },
            },
          },
        },
        isDeleted: false,
        ...(parsedStatus ? { status: parsedStatus } : {}),
        createdAt: {
          gte: startDate,
        },
      },
      include: {
        transactionDetails: {
          include: {
            ticket: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const statsMap = new Map();

    transactions.forEach((transaction) => {
      let label = "";
      const date = new Date(transaction.createdAt);

      switch (selectedPeriod) {
        case "daily":
          label = date.toISOString().split("T")[0]; // YYYY-MM-DD
          break;
        case "weekly":
          const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
          const pastDaysOfYear =
            (date.getTime() - firstDayOfYear.getTime()) / 86400000;
          const weekNum = Math.ceil(
            (pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7
          );
          label = `Week ${weekNum}, ${date.getFullYear()}`;
          break;
        case "monthly":
          label = `${date.toLocaleString("default", {
            month: "long",
          })} ${date.getFullYear()}`;
          break;
        case "yearly":
          label = date.getFullYear().toString();
          break;
      }

      const stats = statsMap.get(label) || {
        label,
        transactions: 0,
        tickets: 0,
        revenue: 0,
      };

      const ticketQty = transaction.transactionDetails.reduce(
        (sum, detail) => sum + detail.qty,
        0
      );

      stats.transactions += 1;
      stats.tickets += ticketQty;
      stats.revenue += Number(transaction.totalAmount);

      statsMap.set(label, stats);
    });

    const stats = Array.from(statsMap.values());

    const summary = {
      totalTransactions: stats.reduce(
        (sum, item) => sum + item.transactions,
        0
      ),
      totalTickets: stats.reduce((sum, item) => sum + item.tickets, 0),
      totalRevenue: stats.reduce((sum, item) => sum + item.revenue, 0),
    };

    return {
      period: selectedPeriod,
      stats,
      summary,
    };
  };

  getOrganizerEvents = async (authUserId: number, query: GetEventsDTO) => {
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
    const { search, take, page, sortBy, sortOrder } = query;

    const whereClause: Prisma.EventWhereInput = {
      organizerId,
      isDeleted: false,
    };
    if (search) {
      whereClause.name = { contains: search, mode: "insensitive" };
    }

    const organizerEvents = await this.prisma.event.findMany({
      where: whereClause,
      include: {
        organizer: true,
        tickets: {
          include: {
            transactions: true,
          },
        },
      },

      orderBy: {
        [sortBy]: sortOrder,
      },
      take,
      skip: take * (page - 1),
    });

    const count = await this.prisma.event.count({
      where: whereClause,
    });

    const totalTransaction = await this.prisma.ticket.count({
      where: {
        event: {
          organizerId,
          isDeleted: false,
        },
      },
    });

    return {
      data: organizerEvents,
      meta: { page, take, total: count },
      totalTransaction,
    };
  };

  updateBankDetails = async (
    authUserId: number,
    body: Partial<UpdateBankDetailsDTO>
  ) => {
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
    const updatedOrganizerBank = await this.prisma.organizer.update({
      where: { id: organizerId },
      data: body,
    });

    return {
      data: updatedOrganizerBank,
      message: "Data organizer updated successfully",
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
}
