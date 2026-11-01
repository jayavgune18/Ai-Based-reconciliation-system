const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  // Check Authorization header first
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  // Fallback to signed cookie
  else if (req.signedCookies && req.signedCookies.token) {
    token = req.signedCookies.token;
  }
  // Fallback to query parameter (useful for direct file downloads like PDF/Excel)
  else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized to access this route. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'User belonging to this token no longer exists.' });
    }
    // Check if account is active
    if (!req.user.isActive) {
      return res.status(401).json({ success: false, message: 'Account has been deactivated. Contact support.' });
    }
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Not authorized. Invalid or expired token.' });
  }
};

const ROLE_HIERARCHY = {
  admin: ['admin', 'finance manager', 'accountant', 'viewer', 'user'],
  'finance manager': ['finance manager', 'accountant', 'viewer', 'user'],
  accountant: ['accountant', 'viewer', 'user'],
  user: ['accountant', 'viewer', 'user'],
  viewer: ['viewer']
};

const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Authentication required.' 
      });
    }

    const userRole = (req.user.role || 'viewer').toLowerCase().trim();
    const normalizedAllowed = allowedRoles.map(r => r.toLowerCase().trim());

    // Super-admin bypass
    if (userRole === 'admin') {
      return next();
    }

    // Direct match
    if (normalizedAllowed.includes(userRole)) {
      return next();
    }

    // Hierarchy check: check if user's role encompasses any of the allowed roles
    const accessibleRoles = ROLE_HIERARCHY[userRole] || [userRole];
    const hasPermission = normalizedAllowed.some(allowed => accessibleRoles.includes(allowed));

    if (hasPermission) {
      return next();
    }

    return res.status(403).json({ 
      success: false, 
      message: `Access denied. Role '${req.user.role}' lacks sufficient privileges. Required: ${allowedRoles.join(', ')}.` 
    });
  };
};

module.exports = { protect, authorize };