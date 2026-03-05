const ApiError = require('../utils/apiError');

function validateRequest(validateFn) {
  return (req, res, next) => {
    try {
      const message = validateFn(req);
      if (message) {
        return next(new ApiError(400, message));
      }
      return next();
    } catch (error) {
      return next(new ApiError(400, error.message || 'Invalid request payload'));
    }
  };
}

module.exports = {
  validateRequest
};