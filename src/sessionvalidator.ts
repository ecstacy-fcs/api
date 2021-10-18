//idle, absolute and renewal timeout
import { sessionValidationOptions } from "src/types"
import prisma from "src/common/client";

export default function sessionValidator(options: sessionValidationOptions) {
    return async function (req, res, next) {

        console.log('inside sessionValidator',req.session.uid)
        if (req.session.uid === undefined || req.session.uid === null) {
            console.log('inside uidcheck')
            next()
            return
        }

        const sessionid = req.sessionID
        const session = await prisma.session.findUnique({
            where: {
                sid: sessionid
            }
        })

        if (session === null) {
            res.sendStatus(400)
            return
        }

        const currentTime = new Date()
        //absolute timeout:
        if (currentTime.getTime() - (new Date(req.session.loginTime)).getTime() >= options.absoluteTimeout) {
            //send a custom error message for session expiration
            req.session.regenerate(function(err){
                res.sendStatus(409)
            }) //after this logout and  ask the user to reauthenticate
            return
        }

        //idle session:
        if (currentTime.getTime() - (new Date(req.session.lastActive)).getTime() >= options.idleTimeout) {
            req.session.regenerate(function(err){
                res.sendStatus(409) //after this logout and ask the user to reauthenticate
            })
            return
        }

        req.session.lastActive = currentTime
        next()
    }
}