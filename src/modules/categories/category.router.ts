import { Router } from "express";
import { injectable } from "tsyringe";
import { validateBody } from "../../middlewares/validation.middleware";
import { CategoryController } from "./category.controller";
import { GetCategorysDTO } from "./dto/get-category.dto";

@injectable()
export class AuthRouter {
  private router: Router;
  private categoryController: CategoryController;

  constructor(CategoryController: CategoryController) {
    this.router = Router();
    this.categoryController = CategoryController;
    this.initializeRoutes();
  }

  private initializeRoutes = () => {
    this.router.post(
      "/categories",
      validateBody(GetCategorysDTO),
      this.categoryController.getCategoriesController
    );
  };

  getRouter() {
    return this.router;
  }
}
