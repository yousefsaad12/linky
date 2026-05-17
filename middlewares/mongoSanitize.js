const mongoSanitize = (req, res, next) => {
  const sanitize = (obj) => {
    if (!obj) return;

    Object.keys(obj).forEach((key) => {
      if (key.includes("$") || key.includes(".")) {
        delete obj[key];
      }
    });
  };

  sanitize(req.body);
  sanitize(req.query);
  sanitize(req.params);

  next();
};

module.exports = mongoSanitize;