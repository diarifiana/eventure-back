import { nanoid } from "nanoid";
import { injectable } from "tsyringe";
import {
  BASE_URL_FE,
  JWT_SECRET_KEY,
  JWT_SECRET_KEY_FORGOT_PASSWORD,
} from "../../config";
import { addMonths } from "../../utils/addMonth";
import { ApiError } from "../../utils/api-error";
import { CloudinaryService } from "../cloudinary/cloudinary.service";
import { MailService } from "../mail/mail.service";
import { PrismaService } from "../prisma/prisma.service";

import { sign } from "jsonwebtoken";
import { access } from "fs";
import { PasswordService } from "../auth/password.service";
import { TokenService } from "../auth/token.service";
import { ReferralService } from "../auth/referral.service";
import { UpdateProfileDTO } from "./dto/update-profile.dto";

@injectable()
export class ProfileService {
  private prisma: PrismaService;
  private passwordService: PasswordService;
  private tokenService: TokenService;
  private mailService: MailService;
  private cloudinaryService: CloudinaryService;
  private referralService: ReferralService;

  constructor(
    PrismaClient: PrismaService,
    PasswordService: PasswordService,
    TokenService: TokenService,
    MailService: MailService,
    CloudinaryService: CloudinaryService,
    ReferralService: ReferralService
  ) {
    this.prisma = PrismaClient;
    this.passwordService = PasswordService;
    this.tokenService = TokenService;
    this.mailService = MailService;
    this.cloudinaryService = CloudinaryService;
    this.referralService = ReferralService;
  }

  getProfile = async (authUserId: number) => {
    const user = await this.prisma.user.findUnique({
      where: { id: authUserId },
      omit: {
        password: true,
        createdAt: true,
        updatedAt: true,
        isDeleted: true,
      },
    });

    if (!user) {
      throw new ApiError("Invalid user id", 404);
    }

    return user;
  };

  updateProfile = async (
    authUserId: number,
    body: Partial<UpdateProfileDTO>
  ) => {
    const user = await this.prisma.user.findUnique({
      where: { id: authUserId },
    });

    if (!user) {
      throw new ApiError("Invalid user id", 404);
    }
    if (user.isDeleted) {
      throw new ApiError("User already deleted", 400);
    }

    if ("password" in body) {
      throw new ApiError("Password cannot be updated via this route", 400);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: authUserId },
      data: body,
    });

    const tokenPayload = {
      id: updatedUser.id,
      role: updatedUser.role,
    };

    const token = sign(tokenPayload, JWT_SECRET_KEY as string, {
      expiresIn: "1h",
    });

    return {
      data: { ...updatedUser, accessToken: token },
      message: "Profile updated successfully",
    };
  };

  deleteProfile = async (id: number) => {
    const user = await this.prisma.user.findUnique({
      where: { id: id },
    });

    if (!user) {
      throw new ApiError("Invalid user id", 404);
    }

    await this.prisma.user.update({
      where: { id: id },
      data: { isDeleted: true, deletedAt: new Date(), email: "" },
    });

    return { message: "Account deleted successfully" };
  };

  uploadProfilePic = async (
    authUserId: number,
    profilePic: Express.Multer.File
  ) => {
    const user = await this.prisma.user.findUnique({
      where: { id: authUserId },
    });

    if (!user) {
      throw new ApiError("Invalid user id", 404);
    }
    if (user.isDeleted) {
      throw new ApiError("User already deleted", 400);
    }

    const { secure_url } = await this.cloudinaryService.upload(profilePic);

    const updatedUser = await this.prisma.user.update({
      where: {
        id: authUserId,
      },
      data: {
        profilePic: secure_url,
      },
    });
    const tokenPayload = {
      id: updatedUser.id,
      role: updatedUser.role,
    };

    const token = sign(tokenPayload, JWT_SECRET_KEY as string, {
      expiresIn: "1h",
    });

    return {
      message: "Profile picture uploaded successfully",
      data: {
        ...updatedUser,
        accessToken: token,
      },
    };
  };

  getCouponByUserId = async (authUserId: number) => {
    const user = await this.prisma.user.findUnique({
      where: { id: authUserId },
    });

    if (!user) {
      throw new ApiError("Invalid user id", 404);
    }

    const coupon = await this.prisma.referralCoupon.findFirst({
      where: {
        userId: authUserId,
        isClaimed: false,
      },
    });

    if (!coupon) {
      return { message: "No available coupon", data: null };
    }

    return { message: "Here is your coupon", data: coupon };
  };

  getTransactionsByUserId = async (userId: number) => {
    const transactions = await this.prisma.transaction.findMany({
      where: { userId },
      include: { ticket: true },
    });

    if (!transactions) {
      throw new ApiError("No data", 400);
    }

    return { message: "Here is your transactions", data: transactions };
  };
}
