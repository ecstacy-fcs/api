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
import multer from "multer";
import { MulterRequest } from "src/multer";
import { v4 as uuidV4 } from "uuid";
import "dotenv/config";

const upload = multer({
  limits: {
    fileSize: 1000000,
  },
  storage: multer.diskStorage({
    destination: "./src/uploads/product-images",
    filename: async (req, file, cb) => {
      const ext = file.mimetype.split("/")[1];
      cb(null, `${uuidV4()}.${ext}`);
    },
  }),
});

const route = express();

const productSchema = Joi.object({
  name: Joi.string().trim().max(28).required(),
  description: Joi.string().trim().max(124).required(),
  price: Joi.number().positive().max(100000).min(1).required(),
  category: Joi.string().trim().required(),
});

const convertImagePath = (product) => {
  product.images.forEach((image) => {
    image.path = `${process.env.API_BASE_URL}/static/product-images/${image.path}`;
  });
};

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
        images: {
          select: {
            path: true,
          },
        },
        category: true,
      },
    });

    products.forEach(convertImagePath);
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
          sellerId: req.user.sellerProfile.id,
          name: value.name,
          description: value.description,
          price: value.price,
          categoryId: value.category,
        },
      });
      respond(res, 200, "success", product);
    } catch (err) {
      console.error(err);
      respond(res, 500, INTERNAL_ERROR);
    }
  }
);

route.get("/categories", async (req, res, next) => {
  try {
    const categories = await prisma.productCategory.findMany();
    respond(res, 200, "success", categories);
  } catch (err) {
    console.error(err);
    respond(res, 500, INTERNAL_ERROR);
  }
});

route.post(
  "/:productId/images",
  isUser,
  isUserVerified,
  isApprovedSellerOrAdmin,
  upload.array("product-image", 3),
  async (req: MulterRequest, res, next) => {
    console.log(req.files);
    req.files.forEach(async (file) => {
      const img = await prisma.productImage.create({
        data: {
          path: file.filename,
          productId: req.params.productId,
        },
      });
    });
    respond(res, 200, "success");
  }
);

route.patch(
  "/:productId/images",
  isUser,
  isUserVerified,
  isApprovedSellerOrAdmin,
  upload.array("product-image", 3),
  async (req: MulterRequest, res, next) => {
    console.log(req.files);
    const prevData = await prisma.productImage.deleteMany({
      where: {
        productId: req.params.productId,
      },
    });

    req.files.forEach(async (file) => {
      const img = await prisma.productImage.create({
        data: {
          path: file.filename,
          productId: req.params.productId,
        },
      });
    });
    respond(res, 200, "success");
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

    product.images.forEach((image) => {
      image.path = `${process.env.API_BASE_URL}/static/product-images/${image.path}`;
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
        data: {
          name: value.name,
          description: value.description,
          price: value.price,
          categoryId: value.category,
        },
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
            images: {
              select: {
                path: true,
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

    category.products.forEach(convertImagePath);
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
            images: {
              select: {
                path: true,
              },
            },
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

    seller.products.forEach(convertImagePath);
    respond(res, 200, "success", seller.products);
  } catch (err) {
    console.error(err);
    respond(res, 500, INTERNAL_ERROR);
  }
});

export default route;
