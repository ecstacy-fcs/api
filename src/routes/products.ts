import { ACCESS_DENIED, INTERNAL_ERROR } from "src/constants/errors";
import express from "express";
import { respond } from "src/lib/request-respond";
import prisma from "src/prisma";

const route = express();

route.get("/", async (req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      include: {
        category: true,
        seller: true,
        images: true,
        orders: true,
      },
    });
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
      include: {
        category: true,
        seller: true,
        images: true,
        orders: true,
      },
    });
    respond(res, 200, "success", product);
  } catch (err) {
    console.error(err);
    respond(res, 500, INTERNAL_ERROR);
  }
});

route.put("/:productId", async (req, res, next) => {
  try {
    const seller = await prisma.seller.findUnique({
      where: {
        userId: req.session.uid,
      },
    });
    const admin = await prisma.admin.findUnique({
      where: {
        userId: req.session.uid,
      },
    });
    if (!seller && !admin) {
      respond(res, 403, ACCESS_DENIED);
      return;
    }

    const product = await prisma.product.update({
      where: {
        id: req.params.productId,
      },
      data: {
        ...req.body,
      },
    });

    respond(res, 200, "success", product);
  } catch (err) {
    console.error(err);
    respond(res, 500, INTERNAL_ERROR);
  }
});

route.delete("/:productId", async (req, res, next) => {
  try {
    const seller = await prisma.seller.findUnique({
      where: {
        userId: req.session.uid,
      },
    });
    const admin = await prisma.admin.findUnique({
      where: {
        userId: req.session.uid,
      },
    });
    if (!seller && !admin) {
      respond(res, 403, ACCESS_DENIED);
      return;
    }

    const product = await prisma.product.delete({
      where: {
        id: req.params.productId,
      },
    });
    respond(res, 200, "success");
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
