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

  createReview = async (body: CreateReviewDTO, uuid: string) => {
    console.log("this is body", body);
    const transaction = await this.prisma.transaction.findFirst({
      where: { uuid },
    });

    if (!transaction || (await transaction).status !== "DONE") {
      throw new ApiError("Cannot submit review", 400);
    }

    const newData = await this.prisma.review.create({
      data: {
        transactionId: transaction.uuid,
        review: body.review,
        rating: body.rating,
      },
    });

    return { message: "Created successfully", newData };
  };

  getReviewsOrganizer = async (slug: string) => {
    const organizer = await this.prisma.organizer.findFirst({
      where: { slug },
    });

    if (!organizer) {
      console.log("Organizer not found");
      return [];
    }

    const data = await this.prisma.review.findMany({
      where: {
        transaction: {
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
      },
      include: { transaction: { include: { user: true } } },
    });

    console.log("get reviews data", data);
    return data;
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
