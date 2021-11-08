import axios from "axios";
import crypto from "crypto";
import express from "express";
import Joi from "joi";
import * as ERROR from "src/constants/errors";
import {
  isBuyer,
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
  isBuyer,
  async (req: any, res, next) => {
    const { value, error } = Joi.object({
      pid: Joi.string().trim().required(),
    }).validate(req.body, { convert: true });
    if (error) {
      console.log(error)
      respond(res, 400, ERROR.BAD_INPUT);
      return;
    }

    const { pid: productId } = value;

    try {
      const product = await prisma.product.findUnique({
        where: { id: productId },
      });
      if (!product) {
        respond(res, 404, ERROR.PRODUCT_NOT_FOUND);
        return;
      }

      const order = await prisma.orders.create({
        data: {
          buyerId: req.user.buyerProfile.id,
          productId: product.id,
          quantity: 1,
        },
      });

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
        callback_url: `${process.env.CLIENT_ORIGIN}/payment`,
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
      respond(res, 200, "Payment Link", response.data.short_url);
    } catch (exception) {
      console.log(exception);
      respond(res, 500, ERROR.INTERNAL_ERROR);
      return;
    }
  }
);

route.get(
  "/validate",
  isUser,
  isNotDeleted,
  isUserVerified,
  isBuyer,
  async (req, res, next) => {
    const payload = req.query.payload as string
    const signature = req.query.signature as string
    const orderId = req.query.orderId as string

    const { value, error } = Joi.object({
      payload: Joi.string().trim().required(),
      signature: Joi.string().trim().required(),
      orderId: Joi.string().trim().required(),
    }).validate(req.query, { convert: true });
    if (error || payload.includes("undefined") || payload.includes("null") || signature.includes("undefined") || signature.includes("null") || orderId.includes("undefined") || orderId.includes("null") || !payload || !signature || !orderId) {
      console.log(error)
      respond(res, 400, ERROR.BAD_INPUT);
      return;
    }

    let generatedSignature: string;

    try {
      generatedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_API_TEST_PASSWORD)
        .update(payload)
        .digest("hex");
    } catch (err) {
      respond(res, 500, ERROR.INTERNAL_ERROR);
      return;
    }

    if (generatedSignature === signature) {
      try {
        await prisma.orders.update({
          where: { id: orderId },
          data: { status: true },
        });
        respond(res, 200, "Payment Successful", { status: true });
        return;
      } catch (exception) {
        respond(res, 500, ERROR.INTERNAL_ERROR, { status: false });
        return;
      }
    }

    respond(res, 400, "Payment Not Successful", { status: false });
    return;
  }
);

export default route;
