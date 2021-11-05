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

route.post(
  "/add-product",
  upload.array("images", 5),
  async (req: MulterRequest, res, next) => {
    const body: ProductBody = req.body;
    const files = req.files;

    try {
      const seller = await prisma.seller.findUnique({
        where: {
          userId: req.session.uid,
        },
      });

      const product = await prisma.product.create({
        data: {
          ...body,
          seller: {
            connect: { id: seller.id },
          },
          category: {
            connect: {
              id: body.category,
            },
          },
        },
      });

      respond(res, 200, "Product creation success", product);
    } catch (err) {
      console.error(err);
      respond(res, 500, INTERNAL_ERROR);
    }
  }
);

route.put("/edit-product/:productId", async (req, res, next) => {});
route.post("/delete-product/:productId", async (req, res, next) => {});
route.delete("/seller-proposal", async (req, res, next) => {});
route.get("/all-products", async (req, res, next) => {});

export default route;
