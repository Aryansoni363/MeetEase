// src/middleware/notFound.js
export default (req, res, next) => {
    res.status(404).json({ success: false, message: 'Route not found' });
  };
  
  