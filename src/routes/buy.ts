import express from "express";
import { respond } from "src/lib/request-respond";
import prisma from "src/prisma";
import * as ERROR from "src/constants/errors";
const route = express();

route.post("/buy-product/:productId", async (req, res, next) => {
  const { productId } = req.params;

  try {
    const buyer = await prisma.buyer.findUnique({
      where: { userId: req.session.uid },
    });

    const order = await prisma.orders.create({
      data: {
        buyer: { connect: { id: buyer.id } },
        product: {
          connect: {
            id: productId,
          },
        },
      },
    });
  } catch (err) {
    console.error(err);
    respond(res, 500, ERROR.INTERNAL_ERRROR);
    return;
  }

  res.sendStatus(200);
});

route.get("/order-history", async (req, res, next) => {
  try {
    const buyer = await prisma.buyer.findUnique({
      where: {
        userId: req.session.uid,
      },
      include: {
        orders: true,
      },
    });

    respond(res, 200, "success", buyer.orders);
  } catch (err) {
    console.error(err);
    respond(res, 500, ERROR.INTERNAL_ERRROR);
  }
});

export default route;
