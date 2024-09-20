import express from "express";
import {UserController} from "./userController";

// eslint-disable-next-line new-cap
const userRouter = express.Router(); // Use Router as a function

const userController = new UserController();

// Define routes

// Route to get a list of users (getList)
userRouter.get("/", (req, res) => userController.query(req, res));

// Route to get a single user by ID (getOne)
userRouter.get("/:id", (req, res) => userController.read(req, res));

// Route to create a new user (create)
userRouter.post("/", (req, res) => userController.create(req, res));

// Route to update a user by ID (update)
userRouter.put("/:id", (req, res) => userController.update(req, res));

// Route to delete a user by ID (delete)
userRouter.delete("/:id", (req, res) => userController.delete(req, res));

export default userRouter;
