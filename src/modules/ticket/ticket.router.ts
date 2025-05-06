import { Router } from "express";
import { injectable } from "tsyringe";
import { TicketController } from "./ticket.controller";
import { JwtMiddleware } from "../../middlewares/jwt.middleware";
import { JWT_SECRET_KEY } from "../../config";
import { verifyRole } from "../../middlewares/role.middleware";
import { CreateTicketDTO } from "./dto/createTicket.dto";
import { validateBody } from "../../middlewares/validation.middleware";

@injectable()
export class TicketRouter {
  private router: Router;
  private ticketController: TicketController;
  private jwtMiddleware: JwtMiddleware;

  constructor(
    TicketController: TicketController,
    JwtMiddleware: JwtMiddleware
  ) {
    this.router = Router();
    this.ticketController = TicketController;
    this.jwtMiddleware = JwtMiddleware;
    this.initializeRoutes();

    console.log("sampe ticket router");
  }

  private initializeRoutes = () => {
    this.router.post(
      "/",
      this.jwtMiddleware.verifyToken(JWT_SECRET_KEY!),
      verifyRole(["ADMIN"]),
      validateBody(CreateTicketDTO),
      this.ticketController.createTicket
    );
  };

  getRouter() {
    return this.router;
  }
}
