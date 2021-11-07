import express from "express";
import { respond } from "src/lib/request-respond";
import { INTERNAL_ERROR } from "src/constants/errors";
import prisma from "src/prisma";
import { MulterRequest } from "src/multer";
import multer, { Multer } from "multer";
import { v4 as uuidv4 } from "uuid";
import { isSeller, isUser } from "src/lib/middlewares";

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

interface ProductBody {
  name: string;
  description: string;
  price: number;
  category: string;
}

route.get("/", isSeller, async (req, res, next) => {
  try {
    const seller = await prisma.seller.findUnique({
      where: {
        userId: req.session.uid,
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
});

route.get("/proposals", async (req, res, next) => {
  // get all seller proposals
});

route.post(
  "/proposal",
  upload.single("proposal"),
  async (req: MulterRequest, res, next) => {
    console.log(req.file);
    const seller = await prisma.seller.create({
      data: {
        userId: req.session.uid,
        approvalDocument: req.file.filename,
      },
    });
    respond(res, 200, "success");
  }
);

route.put("/proposal", async (req, res, next) => {
  // approve or reject a proposal
});

export default route;
