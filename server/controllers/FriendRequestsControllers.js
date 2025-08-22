import User from "../models/UserModel.js";
import mongoose from "mongoose";

export const createFriendRequest = async (request, response, next) => {
  console.log("[CREATE FRIEND REQUEST] Request received, verifying token...");
  try {
    const { friendRequest } = request.body; // Friend's email address
    const userId = request.userId; // Current user's ID from token
    console.log("[CREATE] friendRequest:", friendRequest, "userId:", userId);

    if (!friendRequest) {
      console.log("[CREATE] Missing friend request ID");
      return response.status(400).json({ error: "Friend request ID is required" });
    }

    const currentUser = await User.findById(userId);
    console.log("[CREATE] Current user fetched:", currentUser?.email);
    if (!currentUser) {
      console.log("[CREATE] Current user not found");
      return response.status(404).json({ error: "Current user not found" });
    }

    const friendRequestUser = await User.findOne({ email: friendRequest });
    console.log("[CREATE] Friend request user fetched:", friendRequestUser?.email);

    if (!friendRequestUser) {
      console.log("[CREATE] Friend request target user not found");
      return response.status(404).json({ error: "User with this email does not exist. Please make sure the email address is correct and the user has signed up for the application." });
    }

    // Check if friend request already exists
    if (friendRequestUser.friendRequests.includes(currentUser.email)) {
      console.log("[CREATE] Friend request already exists");
      return response.status(400).json({ error: "Friend request already sent to this user" });
    }

    // Check if users are already friends
    if (friendRequestUser.friends.includes(currentUser.email)) {
      console.log("[CREATE] Users are already friends");
      return response.status(400).json({ error: "You are already friends with this user" });
    }

    const updatedUser = await User.findOneAndUpdate(
      { email: friendRequest }, 
      { $addToSet: { friendRequests: currentUser.email } },
      { new: true, runValidators: true }
    );
    console.log("[CREATE] Friend request updated:", updatedUser?.friendRequests);

    console.log("[CREATE] Friend request successfully added");
    return response.status(201).json({
      message: "Friend request added successfully",
      target: friendRequestUser,
      requester: currentUser,
    });
  } catch (error) {
    console.log("[CREATE] Error:", error.message);
    return response.status(500).json({ error: error.message });
  }
};

export const rejectFriendRequest = async (request, response, next) => {
  console.log("[REJECT FRIEND REQUEST] Request received");
  try {
    const { friendRequest } = request.body;
    const userId = request.userId;
    console.log("[REJECT] friendRequest:", friendRequest, "userId:", userId);

    if (!friendRequest) {
      console.log("[REJECT] Missing friend request email");
      return response.status(400).json({ error: "Friend request email is required" });
    }

    const currentUser = await User.findById(userId);
    console.log("[REJECT] Current user fetched:", currentUser?.email);
    if (!currentUser) {
      console.log("[REJECT] User not found");
      return response.status(404).json({ error: "User not found" });
    }

    const deletedUser = await User.findOne({ email: friendRequest });
    console.log("[REJECT] Target user fetched:", deletedUser?.email);

    currentUser.friendRequests = currentUser.friendRequests.filter(
      (email) => email !== friendRequest
    );

    await currentUser.save();
    console.log("[REJECT] Friend request removed successfully");

    return response.status(200).json({
      message: "Friend request deleted successfully",
      deletedRequest: deletedUser,
    });
  } catch (error) {
    console.log("[REJECT] Error:", error.message);
    return response.status(500).json({ error: error.message });
  }
};

export const acceptFriendRequest = async (request, response, next) => {
  console.log("[ACCEPT FRIEND REQUEST] Request received");
  try {
    const { friendEmail } = request.body;
    const userId = request.userId;
    console.log("[ACCEPT] friendEmail:", friendEmail, "userId:", userId);

    if (!friendEmail) {
      console.log("[ACCEPT] Missing friend's email");
      return response.status(400).json({ error: "Friend's email is required" });
    }

    const currentUser = await User.findById(userId);
    console.log("[ACCEPT] Current user fetched:", currentUser?.email);
    if (!currentUser) {
      console.log("[ACCEPT] User not found");
      return response.status(404).json({ error: "User not found" });
    }

    const friendRequestUser = await User.findOne({ email: friendEmail });
    console.log("[ACCEPT] Friend request user fetched:", friendRequestUser?.email);

    const friendRequestExists = currentUser.friendRequests.includes(friendEmail);
    if (!friendRequestExists) {
      console.log("[ACCEPT] Friend request not found");
      return response.status(400).json({ error: "Friend request not found" });
    }

    currentUser.friendRequests = currentUser.friendRequests.filter(
      (email) => email !== friendEmail
    );

    if (!currentUser.friends.includes(friendEmail)) currentUser.friends.push(friendEmail);
    if (!friendRequestUser.friends.includes(currentUser.email)) friendRequestUser.friends.push(currentUser.email);

    await currentUser.save();
    await friendRequestUser.save();
    console.log("[ACCEPT] Friend request accepted, users updated");

    return response.status(200).json({
      message: "Friend request accepted successfully",
      newFriend: friendRequestUser,
    });
  } catch (error) {
    console.log("[ACCEPT] Error:", error.message);
    return response.status(500).json({ error: error.message });
  }
};

export const getFriendRequests = async (request, response, next) => {
  console.log("[GET FRIEND REQUESTS] Request received");
  try {
    const userId = request.userId;
    console.log("[GET] userId:", userId);

    const user = await User.findById(userId).select("friendRequests");
    console.log("[GET] User fetched, friendRequests:", user?.friendRequests);

    if (!user) {
      console.log("[GET] User not found");
      return response.status(404).json({ error: "User not found" });
    }

    const friendRequestEmails = user.friendRequests;

    if (!friendRequestEmails || friendRequestEmails.length === 0) {
      console.log("[GET] No friend requests found");
      return response.status(200).json({ message: "No friend requests found" });
    }

    const friendRequestUsers = await User.find({
      email: { $in: friendRequestEmails },
    }).select("email firstName lastName image");

    const sortedFriendRequestUsers = friendRequestEmails
      .slice()
      .reverse()
      .map((email) => friendRequestUsers.find((u) => u.email === email));

    console.log("[GET] Friend requests retrieved and sorted");

    return response.status(200).json({ friendRequests: sortedFriendRequestUsers });
  } catch (error) {
    console.log("[GET] Error:", error.message);
    return response.status(500).json({ error: error.message });
  }
};

export const searchFriendRequests = async (request, response, next) => {
  console.log("[SEARCH FRIEND REQUESTS] Request received");
  try {
    const { searchTerm, friendRequests } = request.body;
    const userId = request.userId;
    console.log("[SEARCH] userId:", userId, "searchTerm:", searchTerm);

    if (!searchTerm || !friendRequests) {
      console.log("[SEARCH] Missing searchTerm or friendRequests");
      return response.status(400).json({ error: "searchTerm and friendRequests are required" });
    }

    const sanitizedSearchTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(sanitizedSearchTerm, "i");

    const friendRequestEmails = friendRequests.map((req) => req.email);
    console.log("[SEARCH] Searching in emails:", friendRequestEmails);

    const searchedFriendRequests = await User.find({
      $and: [
        { email: { $in: friendRequestEmails } },
        {
          $or: [
            { firstName: regex },
            { lastName: regex },
            { email: regex },
            {
              $expr: {
                $regexMatch: {
                  input: { $concat: ["$firstName", " ", "$lastName"] },
                  regex: sanitizedSearchTerm,
                  options: "i",
                },
              },
            },
          ],
        },
      ],
    });

    console.log("[SEARCH] Found users:", searchedFriendRequests.map(u => u.email));
    return response.status(200).json({ searchedFriendRequests });
  } catch (error) {
    console.log("[SEARCH] Error:", error.message);
    return response.status(500).json({ error: error.message });
  }
};
