import { injectable } from "tsyringe";
import { PrismaService } from "../prisma/prisma.service";
import { RegisterDTO } from "./dto/register.dto";
import { ApiError } from "../../utils/api-error";
import { PasswordService } from "./password.service";
import { LoginDTO } from "./dto/login.dto";
import { TokenService } from "./token.service";
import {
  BASE_URL_FE,
  JWT_SECRET_KEY,
  JWT_SECRET_KEY_FORGOT_PASSWORD,
} from "../../config";
import { ForgotPasswordDTO } from "./dto/forgot-password.dto";
import { MailService } from "../mail/mail.service";
import { ReferralService } from "./referral.service";
import { nanoid } from "nanoid";
import { addMonths } from "../../utils/addMonth";
import { join } from "path";
import fs from "fs/promises";
import { transporter } from "../../lib/nodemailer";
import Handlebars from "handlebars";

@injectable()
export class AuthService {
  private prisma: PrismaService;
  private passwordService: PasswordService;
  private tokenService: TokenService;
  private mailService: MailService;
  private referralService: ReferralService;

  constructor(
    PrismaClient: PrismaService,
    PasswordService: PasswordService,
    TokenService: TokenService,
    MailService: MailService,
    ReferralService: ReferralService
  ) {
    this.prisma = PrismaClient;
    this.passwordService = PasswordService;
    this.tokenService = TokenService;
    this.mailService = MailService;
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
        },
      });

      if (organizerName) {
        await tx.organizer.create({
          data: {
            userId: createdUser.id,
            name: organizerName,
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
        fullname: fullName,
      }
    );
    return newUser;
  };

  login = async (body: LoginDTO) => {
    const { email, password } = body;

    const existingUser = await this.prisma.user.findFirst({
      where: { email },
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
      { id: existingUser.id },
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

  updateProfile = async (id: number, body: Partial<RegisterDTO>) => {
    const user = await this.prisma.user.findUnique({
      where: { id: id },
    });

    if (!user) {
      throw new ApiError("Invalid user id", 404);
    }

    if ("password" in body) {
      throw new ApiError("Password cannot be updated via this route", 400);
    }
    const { password, ...updateData } = body;

    await this.prisma.user.update({
      where: { id: id, isDeleted: false },
      data: updateData,
    });

    return { message: "Profile updated successfully" };
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
}
