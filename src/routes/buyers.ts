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
        where: {
          user: {
            deleted: false,
            adminProfile: {
              is: null,
            },
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

      respond(res, 200, "Success", buyers);
    } catch (error) {
      console.error(error);
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
              deleted: true,
              banned: true,
            },
          },
        },
      });
      if (!buyer || buyer.user.deleted) {
        respond(res, 404, ERROR.ACCOUNT_NOT_FOUND);
        return;
      }
      respond(res, 200, "Success", buyer);
    } catch (error) {
      respond(res, 500, ERROR.INTERNAL_ERROR);
    }
  }
);

export default route;
