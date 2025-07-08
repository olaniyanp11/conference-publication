// middlewares/checkrole.js
module.exports = function(requiredRole) {
  return function (req, res, next) {
    if (req.user && req.user.role === requiredRole) {
      return next();
    } else {
      req.flash('error', 'Access denied.');
      return res.redirect('/');
    }
  };
};
