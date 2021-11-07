import { Product } from "@prisma/client";
import express from "express";
import Joi from "joi";
import { BAD_INPUT, INTERNAL_ERROR } from "src/constants/errors";
import {
  isApprovedSellerOrAdmin,
  isNotDeleted,
  isUser,
  isUserVerified,
} from "src/lib/middlewares";
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

route.post(
  "/",
  isUser,
  isNotDeleted,
  isUserVerified,
  isApprovedSellerOrAdmin,
  async (req: any, res, next) => {
    const { value, error } = productSchema.validate(req.body, {
      convert: true,
    });
    if (error) {
      respond(res, 400, `${BAD_INPUT}: ${error.message}`);
      return;
    }

    try {
      const product = await prisma.product.create({
        data: {
          sellerId: req.user.sellerId,
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
  }
);

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

route.patch(
  "/:productId",
  isUser,
  isNotDeleted,
  isUserVerified,
  isApprovedSellerOrAdmin,
  async (req, res, next) => {
    const { value, error } = productSchema.validate(req.body, {
      convert: true,
    });
    if (error) {
      respond(res, 400, `${BAD_INPUT}: ${error.message}`);
      return;
    }
    try {
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
  }
);

route.delete(
  "/:productId",
  isUser,
  isNotDeleted,
  isUserVerified,
  isApprovedSellerOrAdmin,
  async (req, res, next) => {
    try {
      const product: Product = await prisma.product.findUnique({
        where: { id: req.params.productId },
      });
      if (!product) {
        respond(res, 404);
        return;
      }
      await prisma.product.delete({
        where: { id: req.params.productId },
      });
      respond(res, 200, "success");
    } catch (err) {
      console.error(err);
      respond(res, 500, INTERNAL_ERROR);
    }
  }
);

route.get("/category/:categoryId", async (req, res, next) => {
  try {
    const category = await prisma.productCategory.findUnique({
      where: { id: req.params.categoryId },
      include: {
        products: {
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
          },
        },
      },
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
      include: {
        products: {
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
          },
        },
      },
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
