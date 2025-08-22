import jwt from "jsonwebtoken";

export const verifyToken = (request, response, next) => {
  console.log(" token varification stage");
  const token = request.cookies.jwt;

  if (!token) {
    return response.status(401).json({ error: "Unauthorized" });
  }

  jwt.verify(token, process.env.JWT_KEY, async (error, payload) => {
    if (error) {
      console.log("error while verifying token : ",error);
      return response.status(403).json({ error: "Token is invalid" });
    }
    console.log("token verified successfully!");
    request.userId = payload.userId;
    next();
  });
};
