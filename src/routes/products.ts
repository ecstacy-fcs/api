import { INTERNAL_ERROR } from "src/constants/errors";
import express from "express";
import { respond } from "src/lib/request-respond";
import prisma from "src/prisma";

const route = express();

route.get("/", async (req, res, next) => {
  try {
    const products = await prisma.product.findMany({});
    respond(res, 200, "all products", products);
  } catch (err) {
    console.error(err);
    respond(res, 500, INTERNAL_ERROR);
  }
});

route.get("/:productId", async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({
      where: {
        id: req.params.productId,
      },
    });
    respond(res, 200, "success", product);
  } catch (err) {
    console.error(err);
    respond(res, 500, INTERNAL_ERROR);
  }
});

route.get("/category/:categoryId", async (req, res, next) => {
  try {
    const category = await prisma.productCategory.findUnique({
      where: {
        id: req.params.categoryId,
      },
      include: {
        product: true,
      },
    });
    respond(res, 200, "success", category.product);
  } catch (err) {
    console.error(err);
    respond(res, 500, INTERNAL_ERROR);
  }
});

route.get("/seller/:sellerId", async (req, res, next) => {
  try {
    const seller = await prisma.seller.findUnique({
      where: {
        id: req.params.sellerId,
      },
      include: {
        products: true,
      },
    });
    respond(res, 200, "success", seller.products);
  } catch (err) {
    console.error(err);
    respond(res, 500, INTERNAL_ERROR);
  }
});

export default route;
