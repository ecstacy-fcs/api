import express from "express";
import { respond } from "src/lib/request-respond";
import { INTERNAL_ERROR } from "src/constants/errors";
import prisma from "src/prisma";
import upload, { MulterRequest } from "src/multer";

const route = express();

interface ProductBody {
  name: string;
  description: string;
  price: number;
  category: string;
}

route.get("/proposals", async (req, res, next) => {});
route.post("/proposal", async (req, res, next) => {});
route.delete("/proposal", async (req, res, next) => {});
route.put("/proposal", async (req, res, next) => {});

export default route;
