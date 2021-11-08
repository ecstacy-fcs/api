import express from "express";
import * as ERROR from "src/constants/errors";
import {
  isAdmin,
  isNotDeleted,
  isUser,
  isUserVerified,
} from "src/lib/middlewares";
import { respond } from "src/lib/request-respond";
import prisma from "src/prisma";

const route = express();

route.get(
  "/",
  isUser,
  isNotDeleted,
  isUserVerified,
  isAdmin,
  async (req, res, next) => {
    try {
      const buyers = await prisma.buyer.findMany({
        select: {
          id: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              verified: true,
            },
          },
        },
      });
      respond(res, 200, "Success", buyers);
    } catch (error) {
      console.log(error);
      respond(res, 500, ERROR.INTERNAL_ERROR);
    }
  }
);

route.get(
  "/:id",
  isUser,
  isNotDeleted,
  isUserVerified,
  isAdmin,
  async (req, res, next) => {
    try {
      const buyer = await prisma.buyer.findUnique({
        where: {
          id: req.params.id,
        },
        select: {
          id: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              verified: true,
            },
          },
        },
      });
      if (!buyer) {
        respond(res, 404, ERROR.ACCOUNT_NOT_FOUND);
        return;
      }
      respond(res, 200, "Success", buyer);
    } catch (error) {
      respond(res, 500, ERROR.INTERNAL_ERROR);
    }
  }
);

route.delete(
  "/:id",
  isUser,
  isNotDeleted,
  isUserVerified,
  isAdmin,
  async (req, res, next) => {
    try {
      await prisma.buyer.delete({
        where: { id: req.params.id },
      });
      respond(res, 200);
    } catch (error) {
      // Record not found
      if (error.code === "P2025") {
        respond(res, 404, ERROR.ACCOUNT_NOT_FOUND);
        return;
      }
      respond(res, 500, ERROR.INTERNAL_ERROR);
    }
  }
);

export default route;
