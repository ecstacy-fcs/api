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
      const sellers = await prisma.seller.findMany({
        where: {
          approved:
            req.query.approved === undefined || req.query.approved === "true",
            user:{
                deleted:false
            }
        },
        select: {
          id: true,
          approved: true,
          approvalDocument: true,
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
      respond(res, req, 200, "Success", sellers);
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
  isAdmin,
  async (req, res, next) => {
    try {
      const seller = await prisma.seller.findUnique({
        where: {
          id: req.params.id,
        },
        select: {
          id: true,
          approved: true,
          approvalDocument: true,
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
      if (!seller || seller.user.deleted) {
        respond(res, req, 404, ERROR.ACCOUNT_NOT_FOUND);
        return;
      }
      respond(res, req, 200, "Success", seller);
    } catch (error) {
      respond(res, req, 500, ERROR.INTERNAL_ERROR);
    }
  }
);

route.patch(
  "/:id/approve",
  isUser,
  isNotDeleted,
  isUserVerified,
  isAdmin,
  async (req, res, next) => {
    try {
      await prisma.seller.update({
        where: { id: req.params.id },
        data: { approved: true },
      });
      respond(res, req, 200);
    } catch (error) {
      // Record not found
      if (error.code === "P2025") {
        respond(res, req, 404, ERROR.ACCOUNT_NOT_FOUND);
        return;
      }
      respond(res, req, 500, ERROR.INTERNAL_ERROR);
    }
  }
);

route.patch(
  "/:id/deny",
  isUser,
  isNotDeleted,
  isUserVerified,
  isAdmin,
  async (req, res, next) => {
    try {
      await prisma.seller.delete({
        where: { id: req.params.id },
      });
      respond(res, req, 200);
    } catch (error) {
      // Record not found
      if (error.code === "P2025") {
        respond(res, req, 404, ERROR.ACCOUNT_NOT_FOUND);
        return;
      }
      respond(res, req, 500, ERROR.INTERNAL_ERROR);
    }
  }
);


export default route;
