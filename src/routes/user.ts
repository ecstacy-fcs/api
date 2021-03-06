import express from "express";
import Joi from "joi";
import {
  ACCESS_DENIED,
  ACCOUNT_NOT_FOUND,
  BAD_INPUT,
  INTERNAL_ERROR,
} from "src/constants/errors";
import { log } from "src/lib/log";
import { mail } from "src/lib/mail";
import {
  isAdmin,
  isNotBanned,
  isNotDeleted,
  isUser,
  isUserVerified,
  isVerifiedUserOrAdmin,
} from "src/lib/middlewares";
import { respond } from "src/lib/request-respond";
import prisma from "src/prisma";
import { verifyToken } from "./auth";

const route = express();

route.get("/", isAdmin, isNotDeleted, isNotBanned, async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        deleted: false,
      },
      include: {
        sellerProfile: true,
        buyerProfile: true,
        adminProfile: true,
      },
    });
    const usersWithoutPassword = users.map(({ password, ...rest }) => rest);
    respond(res, req, 200, "Success", usersWithoutPassword);
  } catch (err) {
    respond(res, req, 500, INTERNAL_ERROR);
  }
});

route.get(
  "/:userId",
  isVerifiedUserOrAdmin,
  isNotDeleted,
  isNotBanned,
  async (req: any, res, next) => {
    const { userId } = req.params;
    if (userId === req.user.id) {
      const { password, ...rest } = req.user;
      respond(res, req, 200, "Success", rest);
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
        if (!user || user.deleted) {
          respond(res, req, 404, ACCOUNT_NOT_FOUND);
          return;
        }
        const { password, ...rest } = user;
        respond(res, req, 200, "Success", rest);
      } catch (err) {
        respond(res, req, 500, INTERNAL_ERROR);
      }
    respond(res, req, 403, ACCESS_DENIED);
  }
);

route.patch(
  "/:userId",
  isVerifiedUserOrAdmin,
  isNotDeleted,
  isNotBanned,
  async (req: any, res, next) => {
    const { value, error } = Joi.object({
      name: Joi.string().trim().max(30).required(),
      phoneNumber: Joi.string().trim().pattern(/\d*/).length(10).optional(),
      address: Joi.string().trim().max(100).optional(),
    }).validate(req.body, { convert: true });
    if (error) {
      respond(res, req, 400, BAD_INPUT);
      return;
    }
    try {
      const { userId } = req.params;
      if (req.user.adminProfile || userId === req.user.id) {
        const user = prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
          respond(res, req, 404, ACCOUNT_NOT_FOUND);
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

        log(req, "UPDATE", `User ${userId} updated`);
        respond(res, req, 200, "Success");
        return;
      }
      respond(res, req, 403, ACCESS_DENIED);
      return;
    } catch (err) {
      respond(res, req, 500, INTERNAL_ERROR);
    }
  }
);

route.delete(
  "/:userId",
  isVerifiedUserOrAdmin,
  isNotDeleted,
  isNotBanned,
  async (req: any, res, next) => {
    let value: any;
    let error: any;
    if (!req.adminProfile) {
      ({ value, error } = Joi.object({
        otp: Joi.string().trim().required(),
      }).validate(req.body, { convert: true }));
      if (error) {
        respond(res, req, 400, BAD_INPUT);
        return;
      }
    }
    try {
      const { userId } = req.params;
      if (req.user.adminProfile || userId === req.user.id) {
        const user = prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
          respond(res, req, 404, ACCOUNT_NOT_FOUND);
          return;
        }
        if (req.user.adminProfile) {
          respond(res, req, 400, "Admin user cannot be deleted");
          return;
        }
        if (req.adminProfile) {
          await prisma.user.update({
            where: { id: userId },
            data: { deleted: true },
          });

          log(req, "DELETE", `User ${userId} deleted by admin`);
          respond(res, req, 200, "Success");
          return;
        }
        const verificationToken = await prisma.token.findFirst({
          where: {
            userId,
            id: value.otp,
            type: "DELETE_ACCOUNT",
          },
        });
        if (!verifyToken(verificationToken, res, req)) return;
        await prisma.token.update({
          where: { id: verificationToken.id },
          data: { valid: false },
        });
        log(req, "UPDATE", "Delete account token invalidated");
        await prisma.user.update({
          where: { id: userId },
          data: { deleted: true },
        });

        log(req, "DELETE", `User ${userId} deleted by user`);
        respond(res, req, 200, "Account deleted");
        return;
      }
      respond(res, req, 403, ACCESS_DENIED);
      return;
    } catch (err) {
      console.error(err);
      respond(res, req, 500, INTERNAL_ERROR);
    }
  }
);

route.post(
  "/request-delete",
  isUser,
  isUserVerified,
  isNotDeleted,
  isNotBanned,
  async (req: any, res, next) => {
    try {
      // Check if valid verification token already exists and sent
      let verificationToken = await prisma.token.findFirst({
        where: {
          userId: req.user.id,
          type: "DELETE_ACCOUNT",
          valid: true,
          createdAt: {
            gt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          },
        },
      });
      if (verificationToken) {
        respond(res, req, 400, "Verification token already sent to email!");
        return;
      }
      await prisma.token.updateMany({
        where: {
          userId: req.user.id,
          type: "DELETE_ACCOUNT",
        },
        data: { valid: false },
      });
      verificationToken = await prisma.token.create({
        data: {
          userId: req.user.id,
          type: "DELETE_ACCOUNT",
        },
      });
      log(req, "CREATE", "Delete account verfication token created");
      try {
        await mail({
          to: req.user.email,
          subject: "Ecstacy - Verify your Delete Account Request",
          html: `<h2>Delete Account OTP</h2>
    <p>Use the following OTP token to confirm your request to delete your account:
      <strong><code>${verificationToken.id}</code></strong
    </p>`,
        });
      } catch (err) {
        respond(res, req, 500, "There was an error sending the email");
        return;
      }
      respond(res, req, 200, "Email sent");
    } catch (err) {
      respond(res, req, 500, INTERNAL_ERROR);
    }
  }
);

route.post(
  "/:userId/ban",
  isUser,
  isNotDeleted,
  isNotBanned,
  isAdmin,
  async (req: any, res, next) => {
    try {
      const { userId } = req.params;
      if (userId === req.user.id) {
        respond(res, req, 400, "You cannot ban yourself!");
        return;
      }
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { adminProfile: true },
      });
      if (!user) {
        respond(res, req, 404, ACCOUNT_NOT_FOUND);
        return;
      }
      if (user.adminProfile) {
        respond(res, req, 400, "Admins can only be banned by a superadmin");
        return;
      }
      await prisma.user.update({
        where: { id: userId },
        data: { banned: true },
      });

      log(req, "UPDATE", `User ${userId} banned`);
      respond(res, req, 200, "Success");
    } catch (error) {
      respond(res, req, 500, INTERNAL_ERROR);
    }
  }
);

route.post(
  "/:userId/unban",
  isUser,
  isNotDeleted,
  isNotBanned,
  isAdmin,
  async (req: any, res, next) => {
    try {
      const { userId } = req.params;
      await prisma.user.update({
        where: { id: userId },
        data: { banned: false },
      });

      log(req, "UPDATE", `User ${userId} unbanned`);
      respond(res, req, 200, "Success");
    } catch (error) {
      // Record not found
      if (error.code === "P2025") {
        respond(res, req, 404, ACCOUNT_NOT_FOUND);
        return;
      }
      respond(res, req, 500, INTERNAL_ERROR);
    }
  }
);

export default route;
