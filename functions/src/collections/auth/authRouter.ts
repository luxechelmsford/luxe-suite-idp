import express from "express";
import {AuthController} from "./authController";

// eslint-disable-next-line new-cap
const authRouter = express.Router(); // Use Router as a functio

const authController = new AuthController();

// Define routes

// Route to get a auth with passed id (get)
authRouter.get("/decode-token", authController.decodeToken);

export default authRouter;
