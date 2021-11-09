import express from "express";
import * as ERROR from "src/constants/errors";
import { log } from "src/lib/log";
import {
  isBuyer,
  isNotDeleted,
  isUser,
  isUserVerified,
} from "src/lib/middlewares";
import { respond } from "src/lib/request-respond";
import prisma from "src/prisma";
const route = express();

route.post(
  "/product/:productId",
  isUser,
  isNotDeleted,
  isUserVerified,
  isBuyer,
  async (req: any, res, next) => {
    const { productId } = req.params;
    try {
      const order = await prisma.orders.create({
        data: {
          buyerId: req.user.buyerProfile.id,
          productId: productId,
        },
      });
      log(req, "CREATE", `Order created for product ${productId}`);
      respond(res, req, 200, "success", order);
    } catch (err) {
      console.error(err);
      respond(res, req, 500, ERROR.INTERNAL_ERROR);
      return;
    }
  }
);

route.get(
  "/orders",
  isUser,
  isNotDeleted,
  isUserVerified,
  isBuyer,
  async (req: any, res, next) => {
    try {
      const orders = await prisma.orders.findMany({
        where: { buyer: { userId: req.user.id } },
      });
      respond(res, req, 200, "success", orders);
    } catch (err) {
      console.error(err);
      respond(res, req, 500, ERROR.INTERNAL_ERROR);
    }
  }
);

export default route;
