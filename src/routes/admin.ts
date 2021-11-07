import prisma from "src/prisma";
import express from "express";
import adminValidator from 'src/lib/validators/admin'
import { respond } from "src/lib/request-respond";
import * as ERROR from 'src/constants/errors'

const route = express();

// route.use(adminValidator);

route.get('/users', async (req, res, next) => {
    try{
        const users = await prisma.user.findMany({
            where:{
                verified: req.query.verified === undefined ? true : req.query.verified==='true'
            },
            select:{
                name: true,
                email: true
            }
        })
        respond(res,200,null,users);
    }catch(error){
        respond(res,500,ERROR.INTERNAL_ERROR);
    }
});

route.get('/users/:id',async (req, res, next) => {
    try{
        const user = await prisma.user.findUnique({
            where:{
                id: req.params.id
            },
            select:{
                name: true,
                email: true
            }
        })
        if(!user){
            respond(res,404,ERROR.ACCOUNT_NOT_FOUND);
        }else{
            respond(res,200,null,user);
        }
        return
    }catch(error){
        respond(res,500,ERROR.INTERNAL_ERROR);
    }
});

route.get('/sellers',async (req, res, next) => {
    try{
        const sellers = await prisma.seller.findMany({
            where:{
                approved: req.query.approved === undefined? true : req.query.approved==='true'
            },
            select:{
                approved: true,
                approvalDocument: true,
                user: {
                    select:{
                        name: true,
                        email: true
                    }
                }
            }
        })
        respond(res,200,null,sellers);
    }catch(error){
        console.log(error);
        respond(res,500,ERROR.INTERNAL_ERROR);
    }
})


route.get('/sellers/:id', async (req, res, next) => {
    try{
        const seller = await prisma.seller.findUnique({
            where:{
                id: req.params.id
            }
        });
        if(!seller){
            respond(res,404,ERROR.ACCOUNT_NOT_FOUND);
        }else{
            respond(res,200,null,seller);
        }
    }catch(error){
        respond(res,500,ERROR.INTERNAL_ERROR);
    }
})

route.post('/sellers/:id', async (req, res, next) => {
    try{
        const seller = await prisma.seller.update({
            where:{
                id: req.params.id
            },
            data:{
                approved: req.body.approved
            }
        });
        respond(res,200);
    }catch(error){
        //Record not found
        if(error.code === 'P2025'){
            respond(res,404,ERROR.ACCOUNT_NOT_FOUND);
        }else{
            respond(res,500,ERROR.INTERNAL_ERROR);
        }
    }
})

route.post("/restrict-user", async (req, res, next) => {});


export default route;