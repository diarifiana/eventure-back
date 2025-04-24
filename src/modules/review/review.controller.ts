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
      const result = await this.reviewService.createReview(req.body);
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
        Number(req.params.id)
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
