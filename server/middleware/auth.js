const jwt = require('jsonwebtoken');

// Middleware: require a valid JWT in the Authorization header.
// Accepts both "Bearer <token>" and raw "<token>".
module.exports = function verifyToken(req, res, next) {
  const header = req.headers['authorization'];
  if (!header) return res.status(401).json({ error: 'No token provided' });

  const token = header.startsWith('Bearer ') ? header.slice(7) : header;

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Invalid or expired token' });
    req.userId = decoded.id;
    next();
  });
};
