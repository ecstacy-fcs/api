export interface RegistrationCredentials
{
    name: string
    email: string
    password: string 
}


export interface LoginCredentials
{
    email: string
    password: string
}

export interface sessionValidationOptions
{
    idleTimeout: number
    absoluteTimeout: number
}

declare module 'express-session'{
    interface SessionData{
        uid: string
        loginTime: Date
        lastActive: Date
        //millisec
    }
}