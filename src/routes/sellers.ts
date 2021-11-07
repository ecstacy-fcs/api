import prisma from "src/prisma";
import express from "express";
import adminValidator from 'src/lib/validators/admin'
import { respond } from "src/lib/request-respond";
import * as ERROR from 'src/constants/errors'
import { isAdmin, isUser, isUserVerified } from "src/lib/middlewares";

const route = express();


route.get('/', isUser, isUserVerified, isAdmin, async (req, res, next) => {
    try{
        console.log('get sellers')
        const sellers = await prisma.seller.findMany({
            where:{
                approved: req.query.approved === undefined? true : req.query.approved==='true'
            },
            select:{
                id: true,
                approved: true,
                approvalDocument: true,
                user: {
                    select:{
                        id: true,
                        name: true,
                        email: true,
                        verified: true,
                    }
                }
            }
        })
        console.log('hey')
        console.log(sellers);
        respond(res,200,null,sellers);
    }catch(error){
        console.log(error);
        respond(res,500,ERROR.INTERNAL_ERROR);
    }
})


route.get('/:id', isUser, isUserVerified, isAdmin, async (req, res, next) => {
    try{
        const seller = await prisma.seller.findUnique({
            where:{
                id: req.params.id
            },
            select:{
                id: true,
                approved: true,
                approvalDocument: true,
                user: {
                    select:{
                        id: true,
                        name: true,
                        email: true,
                        verified: true,
                    }
                }
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

route.patch('/:id/approve', isUser, isUserVerified, isAdmin, async (req, res, next) => {
    try{
        const seller = await prisma.seller.update({
            where:{
                id: req.params.id
            },
            data:{
                approved: true
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

route.patch('/:id/deny', isUser, isUserVerified, isAdmin, async (req, res, next) => {
    try{
        const seller = await prisma.seller.delete({
            where:{
                id: req.params.id
            },
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

route.delete('/:id', isUser, isUserVerified, isAdmin, async (req, res, next) => {
    try{
        const seller = await prisma.seller.delete({
            where:{
                id: req.params.id
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

export default route;