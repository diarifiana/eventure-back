import { Router } from "express";
import { injectable } from "tsyringe";
import { validateBody } from "../../middlewares/validation.middleware";
import { CreateReviewDTO } from "./dto/create-review.dto";
import { ReviewController } from "./review.controller";

@injectable()
export class ReviewRouter {
  private router: Router;
  private reviewController: ReviewController;

  constructor(ReviewController: ReviewController) {
    this.router = Router();
    this.reviewController = ReviewController;
    this.initializeRoutes();
  }

  private initializeRoutes = () => {
    this.router.post(
      "/:uuid",
      validateBody(CreateReviewDTO),
      this.reviewController.createReview
    );

    this.router.get(
      "/organizer/:slug",
      this.reviewController.getReviewsOrganizer
    );

    this.router.delete("/:id", this.reviewController.deleteReview);
  };

  getRouter() {
    return this.router;
  }
}
