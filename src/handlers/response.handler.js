// Standard success/error response format
// All controllers use these helpers for consistent API responses

const ResponseHandler = {
  success(res, result = null, message = 'Success', status = 200) {
    return res.status(status).json({
      success: true,
      result,
      message,
    });
  },

  created(res, result = null, message = 'Created successfully') {
    return this.success(res, result, message, 201);
  },

  paginated(res, result, pagination) {
    return res.status(200).json({
      success: true,
      result,
      pagination,
    });
  },

  error(res, message = 'An error occurred', status = 500) {
    return res.status(status).json({
      success: false,
      message,
    });
  },

  notFound(res, message = 'Record not found') {
    return this.error(res, message, 404);
  },

  forbidden(res, message = 'Access denied') {
    return this.error(res, message, 403);
  },

  validationError(res, errors) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
  },
};

module.exports = ResponseHandler;
