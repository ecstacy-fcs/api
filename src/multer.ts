import { Request } from "express";
import multer from "multer";

const upload = multer({ dest: "uploads/" });

export interface MulterRequest extends Request {
  file: any;
  files: any[];
}

export default upload;
