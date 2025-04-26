import { NextFunction, Request, Response } from "express";
import { injectable } from "tsyringe";
import { VoucherService } from "./voucher.service";
import { plainToInstance } from "class-transformer";
import { CreateVoucherDTO } from "./dto/create-voucher.dto";
import { EventDTO } from "../event/dto/event.dto";

@injectable()
export class VoucherController {
  private voucherService: VoucherService;

  constructor(VoucherService: VoucherService) {
    this.voucherService = VoucherService;
  }

  createVoucher = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.voucherService.createVoucher(req.body);
      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };

  deleteVoucher = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.voucherService.deleteVoucher(
        Number(req.params.id)
      );
      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };

  getVoucherByEvent = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const query = plainToInstance(EventDTO, req.query);
      const result = await this.voucherService.getVoucherByEvent(query);
      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };
}
