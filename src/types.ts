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


declare module 'express-session'{
    interface SessionData{
        uid: string;
    }
}