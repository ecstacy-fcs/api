import 'dotenv/config';
import express from 'express';
import { json } from 'body-parser';
import prisma from './common/client';
import auth from './routes/auth';
import session from 'express-session';
import { PrismaSessionStore } from '@quixo3/prisma-session-store';
import sessionValidator from './sessionValidator';
import cors from 'cors';

const app = express();

app.use(json());
app.use(
  cors({ origin: ['http://localhost:3000'], methods: ['GET', 'POST', 'PATCH'] }) // update this for the VM
);

app.use(
  session({
    secret: process.env.COOKIE_SECRET.split(' '),
    cookie: {
      maxAge: 60 * 60 * 1000,
      httpOnly: true,
      //TODO: set secure to true,
      secure: false,
    },
    name: process.env.SESSION_NAME,
    resave: true,
    saveUninitialized: true,
    store: new PrismaSessionStore(prisma, {
      checkPeriod: 7 * 24 * 60 * 60 * 1000,
      dbRecordIdIsSessionId: true,
    }),
  })
);

app.use(
  sessionValidator({
    idleTimeout: 3 * 60 * 60 * 1000,
    absoluteTimeout: 2 * 24 * 60 * 60 * 1000,
  })
);
//idleTimeout:3*60*60*1000, absoluteTimeout:2*24*60*60*1000
app.use('/auth', auth);

app.get('/', async (req, res, next) => {
  const users = await prisma.user.findMany();
  res.json({ users });
});

app.listen(process.env.PORT, () => {
  console.log('Listening on port', process.env.PORT);
});
