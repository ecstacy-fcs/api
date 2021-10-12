import "dotenv/config";
import express from "express";
import { json } from "body-parser";

const app = express();

app.use(json());

app.get("/", (req, res, next) => {
  res.json({
    hello: "world",
  });
});

app.listen(process.env.PORT, () => {
  console.log("Listening on port", process.env.PORT);
});
