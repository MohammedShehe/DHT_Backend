const validateNumber = (fieldName) => {
  return (req, res, next) => {
    const value = req.body[fieldName];

    if (value === undefined || value === null) {
      return res.status(400).json({
        message: `${fieldName} is required`
      });
    }

    if (typeof value !== 'number' || isNaN(value)) {
      return res.status(400).json({
        message: `${fieldName} must be a valid number`
      });
    }

    if (value <= 0) {
      return res.status(400).json({
        message: `${fieldName} must be greater than 0`
      });
    }

    if (value > 1000000) {
      return res.status(400).json({
        message: `${fieldName} exceeds maximum allowed value`
      });
    }

    next();
  };
};

module.exports = validateNumber;