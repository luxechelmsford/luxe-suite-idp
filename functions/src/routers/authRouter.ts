import express from "express";
import {AuthController} from "../controllers/authController";

// eslint-disable-next-line new-cap
const authRouter = express.Router(); // Use Router as a function

// Define routes

// Route to get a list of auths (getList)
authRouter.get("/claims", (req, res) => AuthController.getClaims(req, res));

export default authRouter;
