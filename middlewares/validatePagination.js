const validatePagination = (req, res, next) => {
  let { page = 1, limit = 20 } = req.query;

  page = parseInt(page);
  limit = parseInt(limit);

  if (isNaN(page) || page < 1) {
    return res.status(400).json({ message: "Page must be a positive integer" });
  }

  if (isNaN(limit) || limit < 1 || limit > 100) {
    return res.status(400).json({
      message: "Limit must be between 1 and 100"
    });
  }

  req.pagination = {
    page,
    limit,
    offset: (page - 1) * limit
  };

  next();
};

module.exports = validatePagination;