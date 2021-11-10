import { MulterError } from "multer";
import {
  ACCESS_DENIED,
  ACCOUNT_DELETED,
  INTERNAL_ERROR,
  UNVERIFIED_ACCOUNT,
} from "src/constants/errors";
import { respond } from "./request-respond";

export const isUser = (req, res, next) => {
  if (req.user) return next();
  respond(res, req, 403, ACCESS_DENIED);
};

export const isNotDeleted = (req, res, next) => {
  if (req.user && !req.user.deleted) return next();
  respond(res, req, 403, ACCOUNT_DELETED);
};

export const isAdmin = (req, res, next) => {
  if (req.user?.adminProfile) return next();
  respond(res, req, 403, ACCESS_DENIED);
};

export const isBuyer = (req, res, next) => {
  if (req.user?.buyerProfile) return next();
  respond(res, req, 403, ACCESS_DENIED);
};

export const isSeller = (req, res, next) => {
  if (req.user?.sellerProfile) return next();
  respond(res, req, 403, ACCESS_DENIED);
};

export const isUserVerified = (req, res, next) => {
  if (req.user?.verified) return next();
  respond(res, req, 403, UNVERIFIED_ACCOUNT);
};

export const isNotBanned = (req, res, next) => {
  if (!req.user?.banned) return next();
  respond(res, req, 403, ACCESS_DENIED);
};

export const isSellerApproved = (req, res, next) => {
  if (req.user?.sellerProfile?.approved) return next();
  respond(res, req, 403, UNVERIFIED_ACCOUNT);
};

export const isApprovedSellerOrAdmin = (req, res, next) => {
  if (req.user?.adminProfile || req?.user?.sellerProfile?.approved)
    return next();
  respond(res, req, 403, ACCESS_DENIED);
};

export const isVerifiedUserOrAdmin = (req, res, next) => {
  if (req.user?.adminProfile || req?.user?.verified) return next();
  respond(res, req, 403, ACCESS_DENIED);
};

export const catchError =
  (middleware: (req, res, next) => any) => (req, res, next) => {
    try {
      middleware(req, res, (err) => {
        if (err instanceof MulterError) {
          respond(res, req, 500, "Error uploading files!");
          return;
        }
        if (err) {
          respond(req, req, 500, INTERNAL_ERROR);
          return;
        }
        next();
      });
    } catch (err) {
      respond(res, req, 500, INTERNAL_ERROR);
    }
  };
