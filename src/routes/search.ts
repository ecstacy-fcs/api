import express from "express";
import { INTERNAL_ERROR } from "src/constants/errors";
import { respond } from "src/lib/request-respond";
import prisma from "src/prisma";

const route = express();

route.get("/:keyword", async(req, res, next)=>
{
    const keyword = req.params.keyword
    if(!keyword)
    {
        respond(res, 200, "No keyword")
    }
    try{
        const products = await prisma.product.findMany({
              where: {
                  seller:
                  {
                      approved: true
                  },
                  OR:[{
                        name: keyword
                      },{
                        category:{
                            name: keyword
                        },
                    },
                ]},

                include: {
                    seller: {
                      select: {
                        id: true,
                      },
                    },
                    images: true,
                    category: true,
                  },
            }); //display products from approved sellers only
        console.log(products)
        respond(res, 200, "search results", products);
    }
    catch(exception)
    {
        console.error(exception);
        respond(res, 500, INTERNAL_ERROR);
    }
})

export default route;