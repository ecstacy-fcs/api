import express from "express";
import * as ERROR from "src/constants/errors";
import { log } from "src/lib/log";
import {
  isBuyer,
  isNotBanned,
  isNotDeleted,
  isUser,
  isUserVerified,
} from "src/lib/middlewares";
import { respond } from "src/lib/request-respond";
import prisma from "src/prisma";
const route = express();

route.get(
  "/orders",
  isUser,
  isNotDeleted,
  isNotBanned,
  isUserVerified,
  isBuyer,
  async (req: any, res, next) => {
    try {
      const orders = await prisma.orders.findMany({
        where: { buyer: { userId: req.user.id } },
        select: {
          id: true,
          status: true,
          time: true,
          quantity: true,
          buyer: {
            select: {
              id: true,
            },
          },
          product: {
            select: {
              id: true,
              name: true,
              price: true,
              seller: {
                select: {
                  id: true,
                  user: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
      respond(res, req, 200, "success", orders);
    } catch (err) {
      console.error(err);
      respond(res, req, 500, ERROR.INTERNAL_ERROR);
    }
  }
);

export default route;
