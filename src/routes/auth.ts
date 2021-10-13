import express from "express";

const route = express();

route.post("/register", async (req, res, next) => {});

route.post("/login", async (req, res, next) => {});

route.get("/logout", async (req, res, next) => {});

route.get("/verify", async (req, res, next) => {});

route.post("/resend-verification-email", async (req, res, next) => {});

route.post("/forgot-password", async (req, res, next) => {});

route.post("/update-password", async (req, res, next) => {});

export default route;
