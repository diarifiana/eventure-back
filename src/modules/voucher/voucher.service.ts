import { injectable } from "tsyringe";
import { ApiError } from "../../utils/api-error";
import { PrismaService } from "../prisma/prisma.service";
import { CreateVoucherDTO } from "./dto/create-voucher.dto";
import { TransactionDTO } from "../transaction/dto/transaction.dto";
import { eventNames } from "process";
import { EventDTO } from "../event/dto/event.dto";

@injectable()
export class VoucherService {
  private prisma: PrismaService;

  constructor(PrismaClient: PrismaService) {
    this.prisma = PrismaClient;
  }

  createVoucher = async (body: CreateVoucherDTO) => {
    const event = await this.prisma.sample.findFirst({
      where: { id: body.eventId },
    });

    if (!event) {
      throw new ApiError("Data Not Found", 404);
    }

    const startDate = new Date(body.startDate);
    const endDate = new Date(body.endDate);
    const { eventId, code, discountAmount, qty } = body;

    if (endDate <= startDate || body.discountAmount <= 0 || body.qty <= 0) {
      throw new ApiError("Data invalid", 400);
    }

    return await this.prisma.voucher.create({
      data: {
        eventId,
        code,
        discountAmount,
        qty,
        startDate,
        endDate,
      },
    });
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

      if (!voucher || voucher.qty <= 0) {
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
