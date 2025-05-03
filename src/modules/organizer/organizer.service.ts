import { injectable } from "tsyringe";
import { ApiError } from "../../utils/api-error";

import { PrismaService } from "../prisma/prisma.service";
import { CloudinaryService } from "../cloudinary/cloudinary.service";
import { UpdateOrganizerDTO } from "./dto/update-organizer.dto";
import { JWT_SECRET_KEY } from "../../config";
import { TokenService } from "../auth/token.service";

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
    organizerId: number
  ) => {
    const organizer = await this.prisma.organizer.findUnique({
      where: { id: organizerId },
    });
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

    const organizerId = user.organizer.id;
    const event = await this.prisma.event.findFirst({
      where: {
        slug,
        organizerId,
      },
      include: {
        organizer: true,
        tickets: { include: { transactions: true } },
      },
    });

    if (!event) {
      throw new ApiError("Event not found or does not belong to you", 404);
    }
    return event;
  };
}
