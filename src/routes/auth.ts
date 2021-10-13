import express from "express";
import emailvalidator from "src/common/emailvalidator";
import { LoginCredentials, RegistrationCredentials } from "src/types";
import passwordvalidator from "src/common/passwordvalidator";
import bcrypt from 'bcrypt';
import prisma from "src/common/client";

const route = express();

route.post("/register", async (req, res, next) => {
    const credentials: RegistrationCredentials = req.body
    if(credentials.name === undefined || credentials.email === undefined || !emailvalidator(credentials.email) || credentials.password === undefined)
    {
        console.log('invalid credentials type')
        res.sendStatus(400);
        return
    }

    if(!passwordvalidator(credentials.password))
    {
        console.log('weak password')
        res.sendStatus(418); //to do: send a custom error response body
        return
    }

    try{
        const salt = await bcrypt.genSalt()
        const hashedPassword = await bcrypt.hash(credentials.password, salt)
        
        const u = await prisma.user.create({data: {
            name: credentials.name,
            email: credentials.email,
            password: hashedPassword,
            buyerProfile: {create: {}}
        }})
        console.log(u)
        console.log(hashedPassword)
    }

    catch (exception){
        console.log(exception)
        res.sendStatus(409);
        return
    }
    
    //send verification mail
    res.sendStatus(200);
});

route.post("/login", async (req, res, next) => {
    // TODO: Session management, Verification system
    const credentials: LoginCredentials = req.body
    if(credentials.email === undefined || credentials.password === undefined || !emailvalidator(credentials.email)){
        res.sendStatus(400)
        return
    }
    try{
        console.log(credentials)
        const user = await prisma.user.findUnique({
            where:{
                email: credentials.email
            }
        })
        console.log(user)
        if(user !== null && !user.verified){
            res.sendStatus(409)
            return
        }
        if(user===null || !(await bcrypt.compare(credentials.password,user.password))){
            res.sendStatus(418)
            return
        }
    }
    catch(exception){
        res.sendStatus(409)
    }
    res.sendStatus(200)
});

route.get("/logout", async (req, res, next) => {});

route.get("/verify", async (req, res, next) => {});

route.post("/resend-verification-email", async (req, res, next) => {});

route.post("/forgot-password", async (req, res, next) => {});

route.post("/update-password", async (req, res, next) => {});

export default route;
