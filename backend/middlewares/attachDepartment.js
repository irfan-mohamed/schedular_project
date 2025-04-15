module.exports = (req, res, next) => {
    const department = req.header('department'); // Cleaner, case-insensitive
  
    if (!department) {
      return res.status(400).json({ error: 'Department info missing in headers' });
    }
  
    req.department = department;
    next();
  };
  