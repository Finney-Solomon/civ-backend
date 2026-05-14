const success = (res, data = null, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

const error = (res, message = 'Error', statusCode = 500, errors = null) => {
  return res.status(statusCode).json({
    success: false,
    message,
    errors,
  });
};

const validationError = (res, errors) => {
  return res.status(400).json({
    success: false,
    message: 'Validation failed',
    errors,
  });
};

const unauthorized = (res, message = 'Unauthorized') => {
  return res.status(401).json({
    success: false,
    message,
  });
};

const forbidden = (res, message = 'Forbidden') => {
  return res.status(403).json({
    success: false,
    message,
  });
};

const badRequest = (res, message = 'Bad request', errors = null) => {
  return res.status(400).json({
    success: false,
    message,
    errors,
  });
};

const conflict = (res, message = 'Conflict', errors = null) => {
  return res.status(409).json({
    success: false,
    message,
    errors,
  });
};

const notFound = (res, message = 'Resource not found') => {
  return res.status(404).json({
    success: false,
    message,
  });
};

module.exports = {
  success,
  error,
  validationError,
  unauthorized,
  forbidden,
  badRequest,
  conflict,
  notFound,
};
