import { Product } from "@prisma/client";
import express from "express";
import Joi from "joi";
import { ACCESS_DENIED, BAD_INPUT, INTERNAL_ERROR } from "src/constants/errors";
import { respond } from "src/lib/request-respond";
import prisma from "src/prisma";

const route = express();

const productSchema = Joi.object({
  name: Joi.string().trim().max(28).required(),
  description: Joi.string().trim().max(124).required(),
  price: Joi.number().positive().max(100000).min(1).required(),
  category: Joi.string().trim().required(),
});

route.get("/", async (req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      include: {
        seller: {
          select: {
            id: true,
            userId: true,
            user: {
              select: {
                name: true,
              },
            },
          },
        },
        images: true,
        category: true,
      },
    });
    respond(res, 200, "all products", products);
  } catch (err) {
    console.error(err);
    respond(res, 500, INTERNAL_ERROR);
  }
});

route.post("/", async (req, res, next) => {
  const { value, error } = productSchema.validate(req.body, { convert: true });
  if (error) {
    respond(res, 400, `${BAD_INPUT}: ${error.message}`);
    return;
  }

  try {
    const seller = await prisma.seller.findUnique({
      where: {
        userId: req.session.uid,
      },
    });

    if (!seller) {
      respond(res, 403, ACCESS_DENIED);
      return;
    }

    const product = await prisma.product.create({
      data: {
        sellerId: seller.id,
        name: value.name,
        description: value.description,
        price: value.price,
        categoryId: value.category,
        images: {
          // handle this
        },
      },
    });
    respond(res, 200, "success", product);
  } catch (err) {
    console.error(err);
    respond(res, 500, INTERNAL_ERROR);
  }
});

route.get("/:productId", async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.productId },
      include: {
        seller: {
          select: {
            id: true,
            userId: true,
            user: {
              select: {
                name: true,
              },
            },
          },
        },
        images: true,
        category: true,
      },
    });
    respond(res, 200, "success", product);
  } catch (err) {
    console.error(err);
    respond(res, 500, INTERNAL_ERROR);
  }
});

route.patch("/:productId", async (req, res, next) => {
  const { value, error } = productSchema.validate(req.body, {
    convert: true,
  });
  if (error) {
    respond(res, 400, `${BAD_INPUT}: ${error.message}`);
    return;
  }

  try {
    const actor =
      (await prisma.seller.findUnique({
        where: { userId: req.session.uid },
      })) ||
      (await prisma.admin.findUnique({
        where: { userId: req.session.uid },
      }));

    if (!actor) {
      respond(res, 403, ACCESS_DENIED);
      return;
    }

    let product: Product = await prisma.product.findUnique({
      where: { id: req.params.productId },
    });
    if (!product) {
      respond(res, 404);
      return;
    }

    product = await prisma.product.update({
      where: { id: req.params.productId },
      data: value,
    });

    respond(res, 200, "success", product);
  } catch (err) {
    console.error(err);
    respond(res, 500, INTERNAL_ERROR);
  }
});

route.delete("/:productId", async (req, res, next) => {
  try {
    const actor =
      (await prisma.seller.findUnique({
        where: { userId: req.session.uid },
      })) ||
      (await prisma.admin.findUnique({
        where: { userId: req.session.uid },
      }));

    if (!actor) {
      respond(res, 403, ACCESS_DENIED);
      return;
    }

    const product: Product = await prisma.product.findUnique({
      where: { id: req.params.productId },
    });
    if (!product) {
      respond(res, 404);
      return;
    }

    await prisma.product.delete({
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
      where: { id: req.params.categoryId },
      include: { products: true },
    });
    if (!category) {
      respond(res, 404);
      return;
    }
    respond(res, 200, "success", category.products);
  } catch (err) {
    console.error(err);
    respond(res, 500, INTERNAL_ERROR);
  }
});

route.get("/seller/:sellerId", async (req, res, next) => {
  try {
    const seller = await prisma.seller.findUnique({
      where: { id: req.params.sellerId },
      include: { products: true },
    });
    if (!seller) {
      respond(res, 404);
      return;
    }
    respond(res, 200, "success", seller.products);
  } catch (err) {
    console.error(err);
    respond(res, 500, INTERNAL_ERROR);
  }
});

export default route;
