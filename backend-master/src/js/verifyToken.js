'use strict';

const JWT = require('jsonwebtoken');
const config = require('getconfig');


module.exports = (req, res, next) => {

  let authHeader = '';

  if ( req.headers.authorization ) {
    authHeader = req.headers.authorization;
  } else if ( req.query.token ) {
    authHeader = 'Bearer ' + req.query.token;
  } else if ( req.body.token ) {
    authHeader = 'Bearer ' + req.body.token;
  }

  if ( !authHeader || authHeader.split(' ').length !== 2 ) {
    return res.boom.unauthorized('No token found in headers.');
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.boom.forbidden('No token provided.');
  }

  // Verify secret and check token expiration
  JWT.verify(token, config.jwt.secret, (error, decoded) => {
    if (error) {
      if (error.name === 'TokenExpiredError') {
        return res.boom.unauthorized('JWT token expired at ' + error.expiredAt.toString());
      }
      return res.boom.unauthorized('Invalid token');
    }

    // If everything is good, save the user for its use in other routes
    req.user = decoded;
    next();
  });
};
