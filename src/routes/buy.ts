import express from "express";
import * as ERROR from "src/constants/errors";
import { respond } from "src/lib/request-respond";
import prisma from "src/prisma";
const route = express();

route.post("/product/:productId", async (req, res, next) => {
  const { productId } = req.params;
  try {
    const buyer = await prisma.buyer.findUnique({
      where: { userId: req.session.uid },
    });
    const order = await prisma.orders.create({
      data: {
        buyerId: buyer.id,
        productId: productId,
      },
    });
    respond(res, 200, "success", order);
  } catch (err) {
    console.error(err);
    respond(res, 500, ERROR.INTERNAL_ERROR);
    return;
  }
});

route.get("/orders", async (req, res, next) => {
  try {
    const orders = await prisma.orders.findMany({
      where: { buyer: { userId: req.session.uid } },
    });
    respond(res, 200, "success", orders);
  } catch (err) {
    console.error(err);
    respond(res, 500, ERROR.INTERNAL_ERROR);
  }
});

export default route;
