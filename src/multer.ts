import { Request, Express } from "express";
import multer, { Multer } from "multer";

export interface MulterRequest extends Request {
  file: any;
  files: any[];
}

export default multer;
