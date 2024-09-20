import express from "express";
import {UserProfileController} from "./userProfileController";

// eslint-disable-next-line new-cap
const userProfileRouter = express.Router(); // Use Router as a function

const userProfileController = new UserProfileController();

// Define routes

// Query of profiles disabled
// Route to get a list of user profiles (getList)
// userProfileRouter.get("/", (req, res) => userProfileController.query(req, res));

// Route to get a single user profile by ID (getOne)
userProfileRouter.get("/:id", (req, res) => userProfileController.read(req, res));

// CReating a profile is disabled, it is created autmatically with user registration
// Route to create a new user profile (create)
// userProfileRouter.post("/", (req, res) => userProfileController.create(req, res));

// Route to update a user profile by ID (update)
userProfileRouter.put("/:id", (req, res) => userProfileController.update(req, res));

// Dleteting a profile will be supported later
// Route to delete a user profile by ID (delete)
// userProfileRouter.delete("/:id", (req, res) => userProfileController.delete(req, res));

export default userProfileRouter;
