const authService = require('../services/authService');

// Auth endpoints delegate token/password logic to the auth service.
async function register(req, res, next) {
  try {
    const result = await authService.registerUser(req.body);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const result = await authService.loginUser(req.body);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: result
    });
  } catch (error) {
    next(error);
  }
}

async function me(req, res, next) {
  try {
    // req.auth is populated by requireAuth middleware from JWT payload.
    const user = await authService.getUserById(req.auth.sub);

    res.status(200).json({
      success: true,
      data: { user }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  register,
  login,
  me
};
