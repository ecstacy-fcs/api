import express from "express";
import { string } from "joi";
import path from "path";
import * as ERROR from "src/constants/errors";
import { log } from "src/lib/log";
import {
  isAdmin,
  isNotBanned,
  isNotDeleted,
  isSeller,
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
      const sellers = await prisma.seller.findMany({
        where: {
          user: {
            deleted: false,
          },
        },
        select: {
          id: true,
          approved: true,
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
  "/:id/proposal",
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
        include: {
          user: true,
        },
      });

      if (!seller || seller.user.deleted) {
        respond(res, req, 404, ERROR.ACCOUNT_NOT_FOUND);
        return;
      }

      res.sendFile(
        path.resolve(__dirname, "../uploads/proposals", seller.approvalDocument)
      );
    } catch (err) {
      console.error(err);
      respond(res, req, 500, ERROR.INTERNAL_ERROR);
    }
  }
);

route.get(
  "/:id/orders",
  isUser,
  isNotDeleted,
  isUserVerified,
  isSeller,
  async (req, res, next) => {
    try {
      const orders = await prisma.orders.findMany({
        where: {
          product: {
            sellerId: req.params.id,
          },
        },
        select: {
          id: true,
          time: true,
          buyer: {
            select: {
              user: {
                select: {
                  name: true,
                },
              },
            },
          },
          product: {
            select: {
              id: true,
              name: true,
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

route.get(
  "/:id",
  isUser,
  isNotDeleted,
  isNotBanned,
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
          // approvalDocument: true,
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
  isNotBanned,
  isUserVerified,
  isAdmin,
  async (req: any, res, next) => {
    try {
      await prisma.seller.update({
        where: { id: req.params.id },
        data: { approved: true },
      });
      log(req, "UPDATE", `Seller ${req.params.id} approved`);
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
  isNotBanned,
  isUserVerified,
  isAdmin,
  async (req: any, res, next) => {
    try {
      await prisma.seller.delete({
        where: { id: req.params.id },
      });

      log(req, "UPDATE", `Seller ${req.params.id} denied`);
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

route.delete(
  "/:id",
  isUser,
  isNotDeleted,
  isUserVerified,
  isAdmin,
  async (req: any, res, next) => {
    try {
      await prisma.seller.delete({
        where: { id: req.params.id },
      });
      log(req, "UPDATE", `Seller ${req.params.id} deleted`);
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
