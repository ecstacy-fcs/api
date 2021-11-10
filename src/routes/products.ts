import { Product } from "@prisma/client";
import "dotenv/config";
import express from "express";
import Joi from "joi";
import multer from "multer";
import { BAD_INPUT, INTERNAL_ERROR } from "src/constants/errors";
import { log } from "src/lib/log";
import {
  catchError,
  isAdmin,
  isApprovedSellerOrAdmin,
  isNotBanned,
  isNotDeleted,
  isUser,
  isUserVerified,
} from "src/lib/middlewares";
import { respond } from "src/lib/request-respond";
import prisma from "src/prisma";
import { v4 as uuidV4 } from "uuid";

const upload = multer({
  limits: {
    fileSize: 1000000,
  },
  storage: multer.diskStorage({
    destination: `${process.env.UPLOADS_ROOT}/product-images`,
    filename: async (req, file, cb) => {
      const ext = file.mimetype.split("/")[1];
      cb(null, `${uuidV4()}.${ext}`);
    },
  }),
});

const route = express();

const productSchema = Joi.object({
  name: Joi.string().trim().max(28).required(),
  description: Joi.string().trim().max(1024).required(),
  price: Joi.number().positive().max(15000).min(1).required(),
  category: Joi.string().trim().required(),
});

export const convertImagePath = (product) => {
  product.images.forEach((image) => {
    image.path = `/static/product-images/${image.path}`;
  });
};

route.get("/", async (req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      where: {
        banned: false,
        seller: {
          approved: true,
          user: {
            banned: false,
            deleted: false,
          },
        },
      },
      include: {
        seller: {
          select: {
            id: true,
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
    respond(res, req, 200, "all products", products);
  } catch (err) {
    console.error(err);
    respond(res, req, 500, INTERNAL_ERROR);
  }
});

route.get(
  "/banned",
  isUser,
  isUserVerified,
  isNotDeleted,
  isNotBanned,
  isAdmin,
  async (req, res, next) => {
    try {
      const products = await prisma.product.findMany({
        where: {
          banned: true,
          seller: {
            user: {
              banned: false,
              deleted: false,
            },
          },
        },
        include: {
          seller: {
            select: {
              id: true,
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
      respond(res, req, 200, "all products", products);
    } catch (err) {
      console.error(err);
      respond(res, req, 500, INTERNAL_ERROR);
    }
  }
);

route.post(
  "/",
  isUser,
  isNotDeleted,
  isNotBanned,
  isUserVerified,
  isApprovedSellerOrAdmin,
  async (req: any, res, next) => {
    const { value, error } = productSchema.validate(req.body, {
      convert: true,
    });
    if (error) {
      respond(res, req, 400, `${BAD_INPUT}: ${error.message}`);
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

      log(
        req,
        "CREATE",
        `New product ${product.id} '${product.name}' added to marketplace`
      );
      respond(res, req, 200, "success", product);
    } catch (err) {
      console.error(err);
      respond(res, req, 500, INTERNAL_ERROR);
    }
  }
);

route.get("/categories", async (req, res, next) => {
  try {
    const categories = await prisma.productCategory.findMany();
    respond(res, req, 200, "success", categories);
  } catch (err) {
    console.error(err);
    respond(res, req, 500, INTERNAL_ERROR);
  }
});

route.post(
  "/:productId/images",
  isUser,
  isUserVerified,
  isNotDeleted,
  isNotBanned,
  isApprovedSellerOrAdmin,
  catchError(upload.array("product-image", 3)),
  async (req: any, res, next) => {
    try {
      console.log(req.files);
      req.files.forEach(async (file) => {
        const img = await prisma.productImage.create({
          data: {
            path: file.filename,
            productId: req.params.productId,
          },
        });
      });
      log(
        req,
        "CREATE",
        `Product images created for product ${req.params.productId}`
      );
      respond(res, req, 200, "success");
    } catch (err) {
      respond(res, req, 500, INTERNAL_ERROR);
    }
  }
);

route.patch(
  "/:productId/images",
  isUser,
  isUserVerified,
  isNotDeleted,
  isNotBanned,
  isApprovedSellerOrAdmin,
  catchError(upload.array("product-image", 3)),
  async (req: any, res, next) => {
    try {
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
      log(
        req,
        "UPDATE",
        `Product images updated for product ${req.params.productId}`
      );
      respond(res, req, 200, "success");
    } catch (err) {
      respond(res, req, 500, INTERNAL_ERROR);
    }
  }
);

route.post(
  "/:productId/ban",
  isUser,
  isUserVerified,
  isNotDeleted,
  isNotBanned,
  isAdmin,
  async (req: any, res, next) => {
    try {
      const product = await prisma.product.update({
        where: {
          id: req.params.productId,
        },
        data: {
          banned: true,
        },
      });

      log(req, "UPDATE", `Product ${req.params.productId} banned`);
      respond(res, req, 200, "success", product);
    } catch (err) {
      console.error(err);
      respond(res, req, 500, INTERNAL_ERROR);
    }
  }
);

route.post(
  "/:productId/unban",
  isUser,
  isUserVerified,
  isNotDeleted,
  isNotBanned,
  isAdmin,
  async (req: any, res, next) => {
    try {
      const product = await prisma.product.update({
        where: {
          id: req.params.productId,
        },
        data: {
          banned: false,
        },
      });
      log(req, "UPDATE", `Product ${req.params.productId} unbanned`);
      respond(res, req, 200, "success", product);
    } catch (err) {
      console.error(err);
      respond(res, req, 500, INTERNAL_ERROR);
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

    if (!product) {
      respond(res, req, 404, "Product not found.", null);
      return;
    }

    convertImagePath(product);
    respond(res, req, 200, "success", product);
  } catch (err) {
    console.error(err);
    respond(res, req, 500, INTERNAL_ERROR);
  }
});

route.patch(
  "/:productId",
  isUser,
  isNotDeleted,
  isNotBanned,
  isUserVerified,
  isApprovedSellerOrAdmin,
  async (req: any, res, next) => {
    const { value, error } = productSchema.validate(req.body, {
      convert: true,
    });
    if (error) {
      respond(res, req, 400, `${BAD_INPUT}: ${error.message}`);
      return;
    }
    try {
      let product: Product = await prisma.product.findUnique({
        where: { id: req.params.productId },
      });
      if (!product) {
        respond(res, req, 404);
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

      log(req, "UPDATE", `Details of product ${product.id} updated`);
      respond(res, req, 200, "success", product);
    } catch (err) {
      console.error(err);
      respond(res, req, 500, INTERNAL_ERROR);
    }
  }
);

route.delete(
  "/:productId",
  isUser,
  isNotDeleted,
  isNotBanned,
  isUserVerified,
  isApprovedSellerOrAdmin,
  async (req: any, res, next) => {
    try {
      const product: Product = await prisma.product.findUnique({
        where: { id: req.params.productId },
      });
      if (!product) {
        respond(res, req, 404);
        return;
      }
      await prisma.product.delete({
        where: { id: req.params.productId },
      });

      log(req, "DELETE", `Product ${product.id} deleted`);
      respond(res, req, 200, "success");
    } catch (err) {
      console.error(err);
      respond(res, req, 500, INTERNAL_ERROR);
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
      respond(res, req, 404);
      return;
    }

    category.products.forEach(convertImagePath);
    respond(res, req, 200, "success", category.products);
  } catch (err) {
    console.error(err);
    respond(res, req, 500, INTERNAL_ERROR);
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
      respond(res, req, 404);
      return;
    }

    seller.products.forEach(convertImagePath);
    respond(res, req, 200, "success", seller.products);
  } catch (err) {
    console.error(err);
    respond(res, req, 500, INTERNAL_ERROR);
  }
});

export default route;
