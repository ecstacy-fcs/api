import express from "express";
import multer from "multer";
import { INTERNAL_ERROR } from "src/constants/errors";
import { log } from "src/lib/log";
import {
  catchError,
  isNotBanned,
  isNotDeleted,
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
    destination: `${process.env.UPLOADS_ROOT}/proposals`,
    filename: async (req, file, cb) => {
      cb(null, `${uuidv4()}.pdf`);
    },
  }),
});

const route = express();

route.get(
  "/",
  isUser,
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
      respond(res, req, 200, "success", seller);
    } catch (err) {
      console.error(err);
      respond(res, req, 500, INTERNAL_ERROR);
    }
  }
);

route.post(
  "/proposal",
  isUser,
  isNotDeleted,
  isNotBanned,
  catchError(upload.single("proposal")),
  async (req: any, res, next) => {
    try {
      console.log(req.file);
      await prisma.seller.create({
        data: {
          userId: req.user.id,
          approvalDocument: req.file.filename,
        },
      });
      log(req, "CREATE", `Seller ${req.user.id} '${req.user.name}' profile created with proposal`);
      respond(res, req, 200, "success");
    } catch (err) {
      respond(res, req, 500, INTERNAL_ERROR);
    }
  }
);

export default route;
