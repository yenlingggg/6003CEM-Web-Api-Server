// server/middleware/authMiddleware.js

const jwt = require('jsonwebtoken');
const User = require('../models/User');


// ensures that incoming requests carry a valid JSON Web Token (JWT) before granting access to protected routes
module.exports = async function (req, res, next) {
  const header = req.header('Authorization');
  if (!header || !header.startsWith('Bearer '))
    return res.status(401).json({ error: 'No token, authorization denied' });

  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.id };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token is not valid' });
  }
};
