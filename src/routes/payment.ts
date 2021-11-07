import express from "express"
import { Buyer, Orders, Product, User } from "@prisma/client"
import prisma from "src/prisma"
import * as ERROR from "src/constants/errors"
import { respond } from "src/lib/request-respond"

const route = express()
const axios = require('axios').default;
const crypto = require('crypto')


route.get("/payfororder", async(req, res, next) =>
    {
        const productID: string = req.body.pid;
        const userID = req.session.uid
        let order: Orders
        let user: User
        let buyer: Buyer
        try{
            buyer = await prisma.buyer.findUnique({where: {userId: userID}
            })
        }
        catch(exception)
        {
            console.log(exception);
            respond(res, 500, ERROR.INTERNAL_ERROR);
            return;
        }

        if(!buyer)
        {
            respond(res, 404, ERROR.ACCOUNT_NOT_FOUND);
            return;
        }

        let product: Product
        try{
            product = await prisma.product.findUnique({where: {id: productID}})
        }
        catch(exception)
        {
            console.log(exception);
            respond(res, 500, ERROR.INTERNAL_ERROR);
            return;
        }

        if(!product)
        {
            respond(res, 404, ERROR.PRODUCT_NOT_FOUND);
            return;
        }

        try {
            user = await prisma.user.findUnique({
              where: {
                id : userID,
              },
            });
        }
        catch(exception)
        {
            console.log(exception);
            respond(res, 500, ERROR.INTERNAL_ERROR);
            return;
        }
                
        if (!user) {
            respond(res, 400, ERROR.ACCOUNT_NOT_FOUND);
            return;
          }

        //create post request
        try{
              order = await prisma.orders.create({
                data: {
                  buyerId: buyer.id,
                  productId: product.id,
                  quantity: 1,
                },
              });

              let body=
              {
                  "amount": product.price,
                  "currency": "INR",
                  "accept_partial": false,
                  "expire_by": ((new Date()).getTime() / 1000)+1200 | 0,
                  "reference_id": order.id,
                  "description": `Payment for 1 ${product.name}`,
                  "customer": {
                    "name": user.name,
                    "email": user.email
                  },
                  "notify": {
                    "email": true
                  },
                  "reminder_enable": true,
                  "callback_url": `${process.env.DEV_HOST}/payment`,
                  "callback_method": "get"
                }

              const response = await axios.post('https://api.razorpay.com/v1/payment_links/', 
                body,
            {
                auth: {
                    username: process.env.RAZORPAY_API_TEST_USERNAME,
                    password: process.env.RAZORPAY_API_TEST_PASSWORD
                  }
              }) 
              respond(res, 200, "Payment Link", response.data.short_url)
            } 

            catch (exception) {
              console.log(exception);
              respond(res, 500, ERROR.INTERNAL_ERROR);
              return;
            }
        }); 

route.post("/validatepayment", async(req, res, next)=>
{
    const razorpay_payload = req.body.razorpay_payload
    const razorpay_signature = req.body.razorpay_signature
    const orderId = req.body.order_id

    if(!razorpay_payload || !razorpay_signature || !orderId)
    {
        respond(res, 400, ERROR.BAD_REQUEST);
    }

    let generated_signature = crypto.createHmac('sha256', process.env.RAZORPAY_API_TEST_PASSWORD).update(razorpay_payload).digest("hex");
    if(generated_signature === razorpay_signature)
    {
        try{
            const updateOrder = await prisma.orders.update({
                where: {
                  id: orderId,
                },
                data: {
                   status: true,
                },
              })
        }
        catch(exception)
        {
            respond(res, 500, ERROR.INTERNAL_ERROR, {"status":false}); 
            return
        }
        respond(res, 200, "Payment Successful", {"status":true})
        return
    }
    else
    {
        respond(res, 200, "Payment Not Successful", {"status":false})
        return
    }
})


export default route;
