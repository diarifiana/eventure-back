import { injectable } from "tsyringe";
import { ApiError } from "../../utils/api-error";

import { PrismaService } from "../prisma/prisma.service";
import { CloudinaryService } from "../cloudinary/cloudinary.service";

@injectable()
export class OrganizerService {
  private prisma: PrismaService;
  private cloudinaryService: CloudinaryService;

  constructor(
    PrismaClient: PrismaService,
    CloudinaryService: CloudinaryService
  ) {
    this.prisma = PrismaClient;
    this.cloudinaryService = CloudinaryService;
  }

  uploadOrganizerPic = async (
    authUserId: number,
    profilePic: Express.Multer.File
  ) => {
    // Cari user
    const user = await this.prisma.user.findUnique({
      where: { id: authUserId },
      include: {
        organizer: true, // include relasi ke organizer
      },
    });

    if (!user) {
      throw new ApiError("Invalid user id", 404);
    }

    if (user.isDeleted) {
      throw new ApiError("User already deleted", 400);
    }

    if (!user.organizer) {
      throw new ApiError("User does not have an organizer", 400);
    }

    const organizerId = user.organizer.id;

    const { secure_url } = await this.cloudinaryService.upload(profilePic);

    await this.prisma.organizer.update({
      where: { id: organizerId },
      data: { profilePic: secure_url },
    });

    return { message: `Organizer profile picture uploaded ${secure_url}` };
  };
}
