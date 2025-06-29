'use strict';

require('dotenv').config();
const Config = require('getconfig');

// Server initialization
const express = require('express');
const boom = require('express-boom');
const passport = require('passport');
const bodyParser = require('body-parser');
//const util = require('./js/util');
const cors = require('cors');
const morganBody = require('morgan-body');

const app = express();
app.use(boom()); // Error standarization
app.use(bodyParser.json({ limit: '100mb' }));
app.use(bodyParser.urlencoded({ limit: '100mb', extended: true }));

app.use(cors({
  origin: '*',
  optionsSuccessStatus: 200
}));

morganBody(app);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Database connection
const mongoose = require('mongoose');
mongoose.connect(Config.DB_URL, { 'useMongoClient': true });


// Database connection
const db = require('./js/db');
db.connect(Config.MONGO_URL);

app.get('/api', (req, res) => {
  res.status(200).send('API works.');
});

require('./js/passport')(passport); // pass passport Twitter, Google and Facebook for configuration

// Import routes
const authenticationRoutes = require('./routes/authentication');
const organizationsRoutes = require('./routes/organizations');
const usersRoutes = require('./routes/users');
const complaintsRoutes = require('./routes/complaints');
const chatRoutes = require('./routes/chat');
const paymentRoutes = require('./routes/payment');
const dataRoutes = require('./routes/data');

app.use(require('cookie-parser')());
app.use(require('body-parser').urlencoded({ extended: true }));
app.use(require('express-session')({ secret: 'keyboard', resave: false }));

app.use('/api/auth', authenticationRoutes);
app.use('/api/organizations', organizationsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/complaints', complaintsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/data', dataRoutes);

// Start server
const port = Config.PORT || 3000;

app.listen(port, () => {
  //Generate default example data in database
  //util.fillDefaultDatabase();
  console.info(`Express server listening on port ${port}`);
});