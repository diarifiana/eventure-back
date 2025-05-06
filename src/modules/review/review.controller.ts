import { NextFunction, Request, Response } from "express";
import { injectable } from "tsyringe";
import { ReviewService } from "./review.service";

@injectable()
export class ReviewController {
  private reviewService: ReviewService;

  constructor(ReviewService: ReviewService) {
    this.reviewService = ReviewService;
  }

  createReview = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const uuid = req.params.uuid;
      const body = req.body;

      console.log(uuid, body, "ini data fe");
      const result = await this.reviewService.createReview(body, uuid);
      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };

  getReviewsOrganizer = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const result = await this.reviewService.getReviewsOrganizer(
        req.params.slug
      );
      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };

  deleteReview = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.reviewService.deleteReview(
        Number(req.params.id)
      );
      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };
}
