import express from "express";
import Joi from "joi";
import {
  ACCESS_DENIED,
  ACCOUNT_NOT_FOUND,
  BAD_INPUT,
  INTERNAL_ERROR,
} from "src/constants/errors";
import {
  isAdmin,
  isNotDeleted,
  isVerifiedUserOrAdmin,
} from "src/lib/middlewares";
import { respond } from "src/lib/request-respond";
import prisma from "src/prisma";
import { verifyToken } from "./auth";

const route = express();

route.get("/", isAdmin, isNotDeleted, async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        sellerProfile: true,
        buyerProfile: true,
        adminProfile: true,
      },
    });
    const usersWithoutPassword = users.map(({ password, ...rest }) => rest);
    respond(res, 200, "Success", usersWithoutPassword);
  } catch (err) {
    respond(res, 500, INTERNAL_ERROR);
  }
});

route.get(
  "/:userId",
  isVerifiedUserOrAdmin,
  isNotDeleted,
  async (req: any, res, next) => {
    const { userId } = req.params;
    if (userId === req.user.id) {
      const { password, ...rest } = req.user;
      respond(res, 200, "Success", rest);
      return;
    }
    if (req.user.adminProfile)
      try {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          include: {
            sellerProfile: true,
            adminProfile: true,
            buyerProfile: true,
          },
        });
        if (!user) {
          respond(res, 404, ACCOUNT_NOT_FOUND);
          return;
        }
        const { password, ...rest } = user;
        respond(res, 200, "Success", rest);
      } catch (err) {
        respond(res, 500, INTERNAL_ERROR);
      }
    respond(res, 403, ACCESS_DENIED);
  }
);

route.patch(
  "/:userId",
  isVerifiedUserOrAdmin,
  isNotDeleted,
  async (req: any, res, next) => {
    const { value, error } = Joi.object({
      name: Joi.string().trim().max(30).required(),
      phoneNumber: Joi.string().trim().length(10).optional(),
      address: Joi.string().trim().max(100).optional(),
    }).validate(req.body, { convert: true });
    if (error) {
      respond(res, 400, BAD_INPUT);
      return;
    }
    try {
      const { userId } = req.params;
      if (req.user.adminProfile || userId === req.user.id) {
        const user = prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
          respond(res, 404, ACCOUNT_NOT_FOUND);
          return;
        }
        await prisma.user.update({
          where: { id: userId },
          data: {
            name: value.name,
            phoneNumber: value.phoneNumber,
            address: value.address,
          },
        });
        respond(res, 200, "Success");
        return;
      }
      respond(res, 403, ACCESS_DENIED);
      return;
    } catch (err) {
      respond(res, 500, INTERNAL_ERROR);
    }
  }
);

route.delete(
  "/:userId",
  isVerifiedUserOrAdmin,
  isNotDeleted,
  async (req: any, res, next) => {
    let value: any;
    let error: any;
    if (!req.adminProfile) {
      ({ value, error } = Joi.object({
        otp: Joi.string().trim().required(),
      }).validate(req.body, { convert: true }));
      if (error) {
        respond(res, 400, BAD_INPUT);
        return;
      }
    }
    try {
      const { userId } = req.params;
      if (req.user.adminProfile || userId === req.user.id) {
        const user = prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
          respond(res, 404, ACCOUNT_NOT_FOUND);
          return;
        }
        if (user.adminProfile) {
          respond(res, 400, "Admin user cannot be deleted");
          return;
        }
        if (req.adminProfile) {
          await prisma.user.update({
            where: { id: userId },
            data: { deleted: true },
          });
          respond(res, 200, "Success");
          return;
        }
        const verificationToken = await prisma.token.findFirst({
          where: {
            userId,
            id: value.otp,
            type: "DELETE_ACCOUNT",
          },
        });
        if (!verifyToken(verificationToken, res)) return;
        await prisma.token.update({
          where: { id: verificationToken.id },
          data: { valid: false },
        });
        await prisma.user.update({
          where: { id: userId },
          data: { deleted: true },
        });
        respond(res, 200, "Account deleted");
      }
      respond(res, 403, ACCESS_DENIED);
      return;
    } catch (err) {
      respond(res, 500, INTERNAL_ERROR);
    }
  }
);

export default route;
