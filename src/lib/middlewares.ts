import { ACCESS_DENIED, UNVERIFIED_ACCOUNT } from "src/constants/errors";
import { respond } from "./request-respond";

export const isUser = (req, res, next) => {
  if (req.user) return next();
  respond(res, 403, ACCESS_DENIED);
};

export const isAdmin = (req, res, next) => {
  if (req.user?.adminProfile) return next();
  respond(res, 403, ACCESS_DENIED);
};

export const isBuyer = (req, res, next) => {
  if (req.user?.buyerProfile) return next();
  respond(res, 403, ACCESS_DENIED);
};

export const isSeller = (req, res, next) => {
  if (req.user?.sellerProfile) return next();
  respond(res, 403, ACCESS_DENIED);
};

export const isUserVerified = (req, res, next) => {
  if (req.user?.verified) return next();
  respond(res, 403, UNVERIFIED_ACCOUNT);
};

export const isSellerApproved = (req, res, next) => {
  if (req.user?.sellerProfile?.approved) return next();
  respond(res, 403, UNVERIFIED_ACCOUNT);
};

export const isApprovedSellerOrAdmin = (req, res, next) => {
  if (req.user?.adminProfile || req?.user?.sellerProfile?.approved)
    return next();
  respond(res, 403, ACCESS_DENIED);
};
