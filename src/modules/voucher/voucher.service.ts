import { injectable } from "tsyringe";
import { ApiError } from "../../utils/api-error";
import { EventDTO } from "../event/dto/event.dto";
import { PrismaService } from "../prisma/prisma.service";
import { TransactionDTO } from "../transaction/dto/transaction.dto";
import { CreateVoucherDTO } from "./dto/create-voucher.dto";

@injectable()
export class VoucherService {
  private prisma: PrismaService;

  constructor(PrismaClient: PrismaService) {
    this.prisma = PrismaClient;
  }

  createVoucher = async (body: CreateVoucherDTO, authUserId: number) => {
    const event = await this.prisma.event.findFirst({
      where: { name: body.eventName },
    });

    if (!event) {
      throw new ApiError("Data Not Found", 404);
    }

    const organizer = await this.prisma.organizer.findFirst({
      where: { userId: authUserId },
    });

    if (!organizer || organizer.id !== event.organizerId) {
      throw new ApiError("Unauthorized", 401);
    }

    const startDate = new Date(body.startDate);
    const endDate = new Date(body.endDate);

    if (endDate <= startDate || body.discountAmount <= 0) {
      throw new ApiError("Data invalid", 400);
    }

    const newVoucher = await this.prisma.voucher.create({
      data: {
        eventName: body.eventName,
        code: body.code,
        discountAmount: body.discountAmount,
        startDate: startDate,
        endDate: endDate,
      },
    });
    return newVoucher;
  };

  deleteVoucher = async (id: number) => {
    const voucher = await this.prisma.voucher.findFirst({
      where: { id },
    });

    if (!voucher) {
      throw new ApiError("Data not found", 400);
    }

    await this.prisma.voucher.update({
      where: { id },
      data: {
        isDeleted: true,
      },
    });
  };

  validateVoucher = async (body: TransactionDTO) => {
    if (body.voucherCode !== "") {
      const voucher = await this.prisma.voucher.findFirst({
        where: { code: body.voucherCode },
      });

      const now = new Date();

      if (!voucher || voucher.endDate <= now) {
        throw new ApiError("Voucher invalid", 400);
      } else {
        return voucher.discountAmount;
      }
    }
    return 0;
  };

  getVoucherByEvent = async (query: Pick<EventDTO, "name">) => {
    const vouchers = await this.prisma.voucher.findMany({
      where: {
        event: {
          name: { contains: query.name, mode: "insensitive" },
        },
      },
    });

    if (!vouchers) {
      throw new ApiError("Data not found", 400);
    }

    return vouchers;
  };
}
