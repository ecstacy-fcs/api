//idle, absolute and renewal timeout
import { sessionValidationOptions } from "src/types"
import prisma from "src/common/client";
import * as ERROR from "src/common/errorcodes"

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
            res.status(400).json({success:"false", error:ERROR.BAD_INPUT})
            return
        }

        const currentTime = new Date()
        //absolute timeout:
        if (currentTime.getTime() - (new Date(req.session.loginTime)).getTime() >= options.absoluteTimeout) {
            //send a custom error message for session expiration
            req.session.regenerate(function(err){
                res.status(401).json({success:false, error:ERROR.SESSION_TIMEOUT})
            }) //after this logout and  ask the user to reauthenticate
            return
        }

        //idle session:
        if (currentTime.getTime() - (new Date(req.session.lastActive)).getTime() >= options.idleTimeout) {
            req.session.regenerate(function(err){
                res.status(401).json({success:false, error:ERROR.SESSION_TIMEOUT}) //after this logout and ask the user to reauthenticate
            })
            return
        }

        req.session.lastActive = currentTime
        next()
    }
}