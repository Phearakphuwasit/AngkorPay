const jwt = require("jsonwebtoken");
const User = require("../models/User");

function protect(roles = []) {
  if (typeof roles === "string") {
    roles = [roles];
  }

  return async function (req, res, next) {
    try {
      let token;

      // Check for token in cookies first, then Authorization header
      if (req.cookies && req.cookies.token) {
        token = req.cookies.token;
      } else {
        const authHeader = req.headers.authorization || req.headers.Authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
          token = authHeader.split(" ")[1];
        }
      }

      if (!token) {
        return res.status(401).json({ message: "Not authorized, token missing" });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || "SECRET_KEY");

      const user = await User.findById(decoded.id);
      if (!user) {
        return res.status(401).json({ message: "Not authorized, user not found" });
      }

      // Check if password changed after token was issued
      if (user.changedPasswordAfter(decoded.iat)) {
        return res.status(401).json({ message: "Password changed, please login again" });
      }

      if (roles.length && !roles.includes(user.role)) {
        return res.status(403).json({ message: "Forbidden: insufficient permissions" });
      }

      req.user = {
        id: user._id,
        role: user.role,
        email: user.email,
        name: user.name,
      };

      next();
    } catch (err) {
      console.error("Auth middleware error:", err);
      return res.status(401).json({ message: "Not authorized, token invalid" });
    }
  };
}

module.exports = { protect };