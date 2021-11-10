import express from "express";
import * as ERROR from "src/constants/errors";
import {
  isAdmin,
  isNotBanned,
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
  isNotBanned,
  isUserVerified,
  isAdmin,
  async (req, res, next) => {
    try {
      const buyers = await prisma.buyer.findMany({
        where: {
          user: {
            deleted: false,
          },
        },
        select: {
          id: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              verified: true,
              banned: true,
            },
          },
        },
      });

      respond(res, req, 200, "Success", buyers);
    } catch (error) {
      console.error(error);
      respond(res, req, 500, ERROR.INTERNAL_ERROR);
    }
  }
);

route.get(
  "/:id",
  isUser,
  isNotDeleted,
  isUserVerified,
  isNotBanned,
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
              deleted: true,
              banned: true,
            },
          },
        },
      });
      if (!buyer || buyer.user.deleted) {
        respond(res, req, 404, ERROR.ACCOUNT_NOT_FOUND);
        return;
      }
      respond(res, req, 200, "Success", buyer);
    } catch (error) {
      respond(res, req, 500, ERROR.INTERNAL_ERROR);
    }
  }
);

export default route;
