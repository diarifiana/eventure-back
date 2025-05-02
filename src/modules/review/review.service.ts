import { injectable } from "tsyringe";
import { ApiError } from "../../utils/api-error";
import { PrismaService } from "../prisma/prisma.service";
import { CreateReviewDTO } from "./dto/create-review.dto";

@injectable()
export class ReviewService {
  private prisma: PrismaService;

  constructor(PrismaClient: PrismaService) {
    this.prisma = PrismaClient;
  }

  createReview = async (body: CreateReviewDTO) => {
    // const transaction = await this.prisma.transaction.findFirst({
    //   where: { id: body.transactionId },
    // });
    // if (!transaction || (await transaction).status !== "DONE") {
    //   throw new ApiError("Cannot submit review", 400);
    // }
    // const newData = await this.prisma.review.create({
    //   data: body,
    // });
    // return { message: "Created successfully", newData };
  };

  getReviewsOrganizer = async (id: number) => {
    return await this.prisma.review.findMany({
      where: {
        transaction: {
          ticket: {
            event: {
              organizerId: id,
            },
          },
        },
      },
    });
  };

  deleteReview = async (id: number) => {
    const review = await this.prisma.review.findFirst({
      where: { id },
    });

    if (!review) {
      throw new ApiError("Data not found", 400);
    }

    await this.prisma.review.update({
      where: { id },
      data: {
        isDeleted: true,
      },
    });
  };
}
