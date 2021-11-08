import {
  ACCESS_DENIED,
  ACCOUNT_BANNED,
  ACCOUNT_DELETED,
  UNVERIFIED_ACCOUNT,
} from "src/constants/errors";
import { respond } from "./request-respond";

export const isUser = (req, res, next) => {
  if (req.user) return next();
  respond(res, 403, ACCESS_DENIED);
};

export const isNotDeleted = (req, res, next) => {
  if (req.user && !req.user.deleted) return next();
  respond(res, 403, ACCOUNT_DELETED);
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

export const isNotBanned = (req, res, next) => {
  if (!req.user?.banned) return next();
  respond(res, 403, ACCOUNT_BANNED);
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

export const isVerifiedUserOrAdmin = (req, res, next) => {
  if (req.user?.adminProfile || req?.user?.verified) return next();
  respond(res, 403, ACCESS_DENIED);
};
