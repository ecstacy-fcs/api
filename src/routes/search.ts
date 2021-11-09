import express from "express";
import { BAD_INPUT, INTERNAL_ERROR } from "src/constants/errors";
import { respond } from "src/lib/request-respond";
import prisma from "src/prisma";

const route = express();

const convertImagePath = (product) => {
  product.images.forEach((image) => {
    image.path = `${process.env.API_BASE_URL}/static/product-images/${image.path}`;
  });
};

route.get("/:keyword", async (req, res, next) => {
  const keyword = req.params.keyword;
  if (!keyword) {
    respond(res, req, 400, BAD_INPUT);
    return;
  }
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
        OR: [
          { name: { contains: keyword } },
          { category: { name: { contains: keyword } } },
        ],
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
    respond(res, req, 200, "search results", products);
  } catch (exception) {
    console.error(exception);
    respond(res, req, 500, INTERNAL_ERROR);
  }
});

export default route;
