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
    if (error) {
      console.error(error);
      respond(res, req, 400, ERROR.BAD_INPUT);
      return;
    }

    const { pid: productId } = value;

    try {
      const user = await prisma.user.findUnique({
        where: {
          id: req.user.id,
        },
      });
      if (!user.address || !user.phoneNumber) {
        respond(res, req, 400, ERROR.BAD_REQUEST);
        return;
      }

      const product = await prisma.product.findUnique({
        where: { id: productId },
      });
      if (!product) {
        respond(res, req, 404, ERROR.PRODUCT_NOT_FOUND);
        return;
      }

      const order = await prisma.orders.create({
        data: {
          buyerId: req.user.buyerProfile.id,
          productId: product.id,
          quantity: 1,
        },
      });
      log(req, "CREATE", `Order created for product ${productId}`);

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

      log(req, "CREATE", `Payment request generated for order ${order.id}`);
      respond(res, req, 200, "Payment Link", response.data.short_url);
    } catch (exception) {
      console.error(exception);
      respond(res, req, 500, ERROR.INTERNAL_ERROR);
      return;
    }
  }
);

route.get(
  "/validate",
  isUser,
  isNotDeleted,
  isUserVerified,
  isNotBanned,
  isBuyer,
  async (req, res, next) => {
    const querySchema = Joi.string()
      .trim()
      .required()
      .not("undefined")
      .not("null");
    const { value, error } = Joi.object({
      payload: querySchema,
      signature: querySchema,
      orderId: querySchema,
    }).validate(req.query, { convert: true });
    if (error) {
      console.log(error);
      respond(res, req, 400, ERROR.BAD_INPUT);
      return;
    }

    let generatedSignature: string;

    try {
      generatedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_API_TEST_PASSWORD)
        .update(value.payload)
        .digest("hex");
    } catch (err) {
      respond(res, req, 500, ERROR.INTERNAL_ERROR);
      return;
    }

    if (generatedSignature === value.signature) {
      try {
        await prisma.orders.update({
          where: { id: value.orderId },
          data: { status: true },
        });
        respond(res, req, 200, "Payment Successful", { status: true });
        return;
      } catch (exception) {
        respond(res, req, 500, ERROR.INTERNAL_ERROR, { status: false });
        return;
      }
    }

    respond(res, req, 400, "Payment Not Successful", { status: false });
    return;
  }
);

export default route;
