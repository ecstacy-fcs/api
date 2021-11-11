import axios from "axios";
import crypto from "crypto";
import express from "express";
import Joi from "joi";
import * as ERROR from "src/constants/errors";
import { log } from "src/lib/log";
import {
  isBuyer,
  isNotBanned,
  isNotDeleted,
  isUser,
  isUserVerified,
} from "src/lib/middlewares";
import { respond } from "src/lib/request-respond";
import prisma from "src/prisma";

const route = express();

route.post(
  "/pay",
  isUser,
  isNotDeleted,
  isUserVerified,
  isNotBanned,
  isBuyer,
  async (req: any, res, next) => {
    const { value, error } = Joi.object({
      pid: Joi.string().trim().required(),
    }).validate(req.body, { convert: true });
    if (!req.user.address || !req.user.phoneNumber) {
      respond(res, req, 400, ERROR.BAD_REQUEST);
      return;
    }
    if (error) {
      console.error(error);
      respond(res, req, 400, ERROR.BAD_INPUT);
      return;
    }
    const { pid: productId } = value;
    try {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        include: {
          seller: {
            include: {
              user: true,
            },
          },
        },
      });
      if (!product) {
        respond(res, req, 404, ERROR.PRODUCT_NOT_FOUND);
        return;
      }
      if (
        (product && product.seller.user.banned) ||
        product.seller.user.deleted ||
        product.banned
      ) {
        respond(res, req, 404, "Product is no longer available");
        return;
      }
      const order = await prisma.orders.create({
        data: {
          buyerId: req.user.buyerProfile.id,
          productId: product.id,
          quantity: 1,
        },
      });
      log(req, "CREATE", `Order ${order.id} created for product ${productId}`);
      const body = {
        amount: product.price * 100, //razorpay processess amount in Paise
        currency: "INR",
        accept_partial: false,
        expire_by: (Date.now() / 1000 + 60 * 20) | 0,
        reference_id: order.id,
        description: `Payment for 1 ${product.name}`,
        customer: {
          name: req.user.name,
          email: req.user.email,
        },
        notify: {
          email: true,
        },
        callback_url: `${process.env.API_BASE_URL}/payment/validate`,
        callback_method: "get",
      };
      const response = await axios.post(
        "https://api.razorpay.com/v1/payment_links/",
        body,
        {
          auth: {
            username: process.env.RAZORPAY_API_TEST_USERNAME,
            password: process.env.RAZORPAY_API_TEST_PASSWORD,
          },
        }
      );
      await new Promise((f) => setTimeout(f, 3000));
      log(req, "CREATE", `Payment request generated for order ${order.id}`);
      respond(res, req, 200, "Payment Link", response.data.short_url);
    } catch (exception) {
      console.error(exception);
      respond(res, req, 500, ERROR.INTERNAL_ERROR);
      return;
    }
  }
);

route.get("/validate", async (req: any, res, next) => {
  const querySchema = Joi.string()
    .trim()
    .required()
    .not("undefined")
    .not("null");
  const { value, error } = Joi.object({
    razorpay_payment_id: querySchema,
    razorpay_payment_link_id: querySchema,
    razorpay_payment_link_reference_id: querySchema,
    razorpay_payment_link_status: querySchema,
    razorpay_signature: querySchema,
  }).validate(req.query, { convert: true });
  if (error) {
    console.log(error);
    respond(res, req, 400, ERROR.BAD_INPUT);
    return;
  }
  const {
    razorpay_payment_id: paymentId,
    razorpay_payment_link_id: paymentLinkId,
    razorpay_payment_link_reference_id: orderId,
    razorpay_payment_link_status: status,
    razorpay_signature: signature,
  } = value;
  const payload = [paymentLinkId, orderId, status, paymentId].join("|");
  let generatedSignature: string;
  try {
    generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_API_TEST_PASSWORD)
      .update(payload)
      .digest("hex");
  } catch (err) {
    res.redirect(`${process.env.CLIENT_ORIGIN}/payment?status=failure`);
    return;
  }
  if (generatedSignature === signature) {
    try {
      const order = await prisma.orders.update({
        where: { id: orderId },
        data: { status: true },
        include: { buyer: { include: { user: true } } },
      });
      log(
        { ...req, user: order.buyer.user },
        "CREATE",
        `Payment recorded for order ${orderId}`
      );
      res.redirect(`${process.env.CLIENT_ORIGIN}/payment?status=success`);
      return;
    } catch (exception) {
      res.redirect(`${process.env.CLIENT_ORIGIN}/payment?status=failure`);
      return;
    }
  }
  res.redirect(`${process.env.CLIENT_ORIGIN}/payment?status=failure`);
  return;
});

export default route;
