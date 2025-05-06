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

  getTranscationByOrganizer = async (
    authUserId: number,
    query: GetTransactionsDTO,
    status?: string
  ) => {
    // getTransactionByOrganizer = async (authUserId: number, status?: string) => {
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

    // Updated where clause using relation filters
    const baseWhere: Prisma.TransactionWhereInput = {
      transactionDetails: {
        some: {
          ticket: {
            event: {
              organizerId,
              ...(search
                ? {
                    name: {
                      contains: search,
                      mode: "insensitive",
                    },
                  }
                : {}),
            },
          },
        },
      },
      isDeleted: false,
      ...(parsedStatus ? { status: parsedStatus } : {}),
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

  // getTranscationByOrganizer = async (authUserId: number, status?: string) => {
  //   // getTransactionByOrganizer = async (authUserId: number, status?: string) => {
  //   const user = await this.prisma.user.findUnique({
  //     where: { id: authUserId },
  //     include: {
  //       organizer: true,
  //     },
  //   });

  //   if (!user?.organizer) {
  //     throw new ApiError("You don't have an organizer", 404);
  //   }

  //   const organizerId = user.organizer.id;
  //   const parsedStatus = Object.values(Status).includes(status as Status)
  //     ? (status as Status)
  //     : undefined;

  //   // Updated where clause using relation filters
  //   const baseWhere = {
  //     transactionDetails: {
  //       some: {
  //         ticket: {
  //           event: {
  //             organizerId,
  //           },
  //         },
  //       },
  //     },
  //     isDeleted: false,
  //     ...(parsedStatus ? { status: parsedStatus } : {}),
  //   };

  //   const [transactions, totalTransaction, totalTicketQty] = await Promise.all([
  //     this.prisma.transaction.findMany({
  //       where: baseWhere,
  //       include: {
  //         user: true,
  //         transactionDetails: {
  //           include: {
  //             ticket: {
  //               include: {
  //                 event: true,
  //               },
  //             },
  //           },
  //         },
  //         voucher: true,
  //         referralCoupon: true,
  //       },
  //     }),
  //     this.prisma.transaction.aggregate({
  //       where: baseWhere,
  //       _count: { uuid: true },
  //       _sum: { totalAmount: true },
  //     }),
  //     this.prisma.transactionDetail.aggregate({
  //       where: {
  //         transaction: {
  //           ...baseWhere,
  //         },
  //       },
  //       _sum: { qty: true },
  //     }),
  //   ]);

  //   return {
  //     transactions,
  //     totalCount: totalTransaction._count?.uuid ?? 0,
  //     totalRevenue: totalTransaction._sum?.totalAmount ?? 0,
  //     totalTicket: totalTicketQty._sum?.qty ?? 0,
  //   };
  // };

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
      ? {
          transactionDetails: {
            some: {
              ticket: {
                eventId: event?.id,
              },
            },
          },
        }
      : {
          transactionDetails: {
            some: {
              ticket: {
                event: {
                  organizerId,
                  isDeleted: false,
                },
              },
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

    const [transactions, totalTransactions, totalRevenue, totalTicketQty] =
      await Promise.all([
        this.prisma.transaction.findMany({
          where: baseWhereWithIsDeleted,
          include: {
            ticket: { include: { event: true } },
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
        }),
        this.prisma.transaction.aggregate({
          where: baseWhereWithIsDeleted,
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
    // Validate user is an organizer
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

    // Parse status if provided
    const parsedStatus = Object.values(Status).includes(status as Status)
      ? (status as Status)
      : undefined;

    // Set default period if not provided
    const validPeriods = ["daily", "weekly", "monthly", "yearly"];
    const selectedPeriod =
      period && validPeriods.includes(period) ? period : "monthly";

    // Define time range based on period
    const now = new Date();
    let startDate = new Date();

    switch (selectedPeriod) {
      case "daily":
        // Last 30 days
        startDate.setDate(now.getDate() - 30);
        break;
      case "weekly":
        // Last 12 weeks
        startDate.setDate(now.getDate() - 84); // 12 * 7 days
        break;
      case "monthly":
        // Last 6 months
        startDate.setMonth(now.getMonth() - 6);
        break;
      case "yearly":
        // Last 5 years
        startDate.setFullYear(now.getFullYear() - 5);
        break;
    }

    // Get all transactions for this organizer within the time period
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

    // Process the transactions to get statistics by period
    const statsMap = new Map();

    transactions.forEach((transaction) => {
      // Format date based on period
      let label = "";
      const date = new Date(transaction.createdAt);

      switch (selectedPeriod) {
        case "daily":
          label = date.toISOString().split("T")[0]; // YYYY-MM-DD
          break;
        case "weekly":
          // Get the week number and year
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

      // Get existing stats or create new entry
      const stats = statsMap.get(label) || {
        label,
        transactions: 0,
        tickets: 0,
        revenue: 0,
      };

      // Calculate quantities
      const ticketQty = transaction.transactionDetails.reduce(
        (sum, detail) => sum + detail.qty,
        0
      );

      // Update stats
      stats.transactions += 1;
      stats.tickets += ticketQty;
      stats.revenue += Number(transaction.totalAmount);

      // Update map
      statsMap.set(label, stats);
    });

    // Convert map to array and sort by label
    const stats = Array.from(statsMap.values());

    // Calculate summary totals
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
    // console.log("organizerEvents", organizerEvents);
    // const eventsWithTransactionCount = organizerEvents.map((event) => {
    //   const totalTransactions = event.tickets.reduce(
    //     (acc, ticket) => acc + ticket.transactions.length,
    //     0
    //   );

    //   return {
    //     data: organizerEvents,
    //     totalTransactions,
    //   };
    // });

    const count = await this.prisma.event.count({
      where: whereClause,
    });

    const totalTransaction = await this.prisma.transaction.count({
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
}
