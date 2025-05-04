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
import { ChangePasswordDTO } from "./dto/change-password.dto";
import { ForgotPasswordDTO } from "./dto/forgot-password.dto";
import { LoginDTO } from "./dto/login.dto";
import { RegisterDTO } from "./dto/register.dto";
import { ResetPasswordDTO } from "./dto/reset-password.dto";
import { PasswordService } from "./password.service";
import { ReferralService } from "./referral.service";
import { TokenService } from "./token.service";
import { sign } from "jsonwebtoken";
import { access } from "fs";

@injectable()
export class AuthService {
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

  register = async (body: RegisterDTO) => {
    const { fullName, userName, email, password, referralUsed, organizerName } =
      body;

    const existingUser = await this.prisma.user.findFirst({
      where: { email },
    });

    if (existingUser) {
      throw new ApiError("Email already exist", 400);
    }

    await this.referralService.validateReferralNumber(referralUsed);

    const hashedPassword = await this.passwordService.hashPassword(password);
    const code = nanoid(6);

    const newUser = await this.prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          fullName,
          userName,
          email,
          password: hashedPassword,
          referralNumber: code,
          role: organizerName ? "ADMIN" : "USER",
          profilePic:
            "https://res.cloudinary.com/dsxiuvsls/image/upload/v1746272439/usericon_tu7bka.webp",
        },
      });

      if (organizerName) {
        await tx.organizer.create({
          data: {
            userId: createdUser.id,
            name: organizerName,
            profilePic:
              "https://res.cloudinary.com/dsxiuvsls/image/upload/v1746272439/groupicon_yiesgy.webp",
          },
        });
      }
      if (referralUsed) {
        const referral = await tx.user.findUnique({
          where: { referralNumber: referralUsed },
        });

        if (referral) {
          const couponCode = nanoid(8);
          await tx.referralCoupon.create({
            data: {
              userId: createdUser.id,
              referralCoupon: couponCode,
              amount: 30000,
              expiredAt: addMonths(new Date(), 3),
            },
          });

          const now = new Date();
          const existingPoint = await tx.pointDetail.findFirst({
            where: {
              userId: referral.id,
              expiredAt: {
                gt: now,
              },
            },
          });

          if (existingPoint) {
            await tx.pointDetail.update({
              where: { id: existingPoint.id },
              data: {
                amount: existingPoint.amount + 30000,
              },
            });
          } else {
            await tx.pointDetail.create({
              data: {
                userId: referral.id,
                amount: 30000,
                expiredAt: addMonths(new Date(), 3),
              },
            });
          }
        }
      }

      return createdUser;
    });
    await this.mailService.sendEmail(
      email,
      "Welcome To Eventure",
      "welcome-email",
      {
        name: fullName,
      }
    );
    return newUser;
  };

  login = async (body: LoginDTO) => {
    const { email, password } = body;

    const existingUser = await this.prisma.user.findFirst({
      where: { email },
      include: {
        organizer: true,
      },
    });

    if (!existingUser) {
      throw new ApiError("Invalid credentials", 400);
    }

    const isPasswordValid = await this.passwordService.comparePassword(
      password,
      existingUser.password
    );

    if (!isPasswordValid) {
      throw new ApiError("Invalid credentials", 400);
    }

    const accessToken = this.tokenService.generateToken(
      { id: existingUser.id, role: existingUser.role },
      JWT_SECRET_KEY!,
      { expiresIn: "2h" }
    );

    const { password: pw, ...userWithoutPassword } = existingUser;

    return { ...userWithoutPassword, accessToken };
  };

  forgotPassword = async (body: ForgotPasswordDTO) => {
    const { email } = body;

    const user = await this.prisma.user.findFirst({
      where: { email },
    });

    if (!user) {
      throw new ApiError("Invalid email address", 400);
    }

    const token = this.tokenService.generateToken(
      { id: user.id },
      JWT_SECRET_KEY_FORGOT_PASSWORD!,
      { expiresIn: "1h" }
    );

    const link = `${BASE_URL_FE}/reset-password/${token}`;

    await this.mailService.sendEmail(
      email,
      "Link reset password",
      "forgot-password",
      { name: user.fullName, resetLink: link, expiryTime: 1 }
    );

    return { message: "Send email succsess" };
  };

  updateProfile = async (authUserId: number, body: Partial<RegisterDTO>) => {
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
    const { password, ...updateData } = body;

    const filteredData = Object.fromEntries(
      Object.entries(updateData).filter(
        ([_, value]) => value !== "" && value !== undefined && value !== null
      )
    );

    console.log("Filtered Update data:", filteredData);

    const updatedUser = await this.prisma.user.update({
      where: { id: authUserId },
      data: filteredData,
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

  resetPassword = async (body: ResetPasswordDTO, authUserId: number) => {
    const user = await this.prisma.user.findFirst({
      where: {
        id: authUserId,
      },
    });

    if (!user) {
      throw new ApiError("User not found", 404);
    }

    const hashedPassword = await this.passwordService.hashPassword(
      body.password
    );

    await this.prisma.user.update({
      where: {
        id: authUserId,
      },
      data: {
        password: hashedPassword,
      },
    });

    return {
      message: "Password reset successfully",
    };
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

  changePassword = async (authUserId: number, body: ChangePasswordDTO) => {
    const user = await this.prisma.user.findFirst({
      where: { id: authUserId },
    });

    if (!user) {
      throw new ApiError("User not found", 401);
    }

    const isPasswordValid = await this.passwordService.comparePassword(
      body.oldPassword,
      user.password
    );

    if (!isPasswordValid) {
      throw new ApiError("Old password is incorrect", 404);
    }

    const hashedNewPassword = await this.passwordService.hashPassword(
      body.newPassword
    );

    await this.prisma.user.update({
      where: { id: authUserId },
      data: { password: hashedNewPassword },
    });

    return {
      message: "Password changed successfully",
    };
  };

  uploadOrganizerPic = async (
    authUserId: number,
    profilePic: Express.Multer.File
  ) => {
    // Cari user
    const user = await this.prisma.user.findUnique({
      where: { id: authUserId },
      include: {
        organizer: true,
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
