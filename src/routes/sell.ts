import express from "express";
import multer from "multer";
import { INTERNAL_ERROR } from "src/constants/errors";
import { log } from "src/lib/log";
import {
  isNotBanned,
  isNotDeleted,
  isSeller,
  isUser,
} from "src/lib/middlewares";
import { respond } from "src/lib/request-respond";
import prisma from "src/prisma";
import { v4 as uuidv4 } from "uuid";

const upload = multer({
  limits: {
    fileSize: 1000000,
  },
  storage: multer.diskStorage({
    destination: "./src/uploads/proposals",
    filename: async (req, file, cb) => {
      cb(null, `${uuidv4()}.pdf`);
    },
  }),
});

const route = express();

route.get(
  "/",
  isSeller,
  isNotDeleted,
  isNotBanned,
  async (req: any, res, next) => {
    try {
      const seller = await prisma.seller.findUnique({
        where: {
          userId: req.user.id,
        },
        include: {
          products: true,
        },
      });
      respond(res, 200, "success", seller);
    } catch (err) {
      console.error(err);
      respond(res, 500, INTERNAL_ERROR);
    }
  }
);

route.post(
  "/proposal",
  isUser,
  isNotDeleted,
  isNotBanned,
  upload.single("proposal"),
  async (req: any, res, next) => {
    console.log(req.file);
    await prisma.seller.create({
      data: {
        userId: req.user.id,
        approvalDocument: req.file.filename,
      },
    });
    log(req, "CREATE", "Seller profile created with proposal");
    respond(res, 200, "success");
  }
);

export default route;
