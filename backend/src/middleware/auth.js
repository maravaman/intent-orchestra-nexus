export const authenticateToken = (authService) => {
  return async (req, res, next) => {
    try {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

      if (!token) {
        return res.status(401).json({
          success: false,
          error: 'Access token required'
        });
      }

      const user = await authService.validateSession(token);
      req.user = user;
      next();
    } catch (error) {
      return res.status(403).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }
  };
};

export const optionalAuth = (authService) => {
  return async (req, res, next) => {
    try {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];

      if (token) {
        try {
          const user = await authService.validateSession(token);
          req.user = user;
        } catch (error) {
          // Continue without authentication
          req.user = null;
        }
      }
      
      next();
    } catch (error) {
      next();
    }
  };
};