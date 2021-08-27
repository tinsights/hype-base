import express from 'express';
import pg from 'pg';
import methodOverride from 'method-override';
import cookieParser from 'cookie-parser';
import jsSHA from 'jssha';
import axios from 'axios';

const SALT = 'pepper pots';

const { Pool } = pg;

const pgConnectionConfigs = {
  user: 'tail',
  host: 'localhost',
  database: 'hypebase',
  port: 5432,
};

const pool = new Pool(pgConnectionConfigs);

const app = express();

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));
app.use(methodOverride('_method'));
app.use(cookieParser());

setTimeout(() => {
  // landing page (not sure what goes here for now)
  app.get('/', landingPage);
  // user registration, get-> signup form, post-> submit form
  app.get('/signup', userRegister);
  app.post('/signup', userRegister);
  // // user login, get-> login form, post-> submit form
  app.get('/login', userLogin);
  app.post('/login', userLogin);
  // app.delete('/logout', userLogout);
  // // create a launch, get-> creation form, post-> submit form
  app.get('/create-launch', createLaunch);
  app.post('/create-launch', createLaunch);
  // view a launch, access submit-bid form
  app.get('/launch', allLaunches);
  // app.get('/launch/:id', viewLaunch);
  // // submit a bid for a launch
  // app.post('/launch/:id/bid', submitBid);
  app.use((req, res) => {
    res.status(404).send('404 NOT FOUND');
  });

  app.listen(3004);
}, 0);

const landingPage = (req, res) => {
  console.log('Landing Page');
  res.render('index');
};

const userRegister = (req, res) => {
  console.log('Register');
  if (req.method === 'GET') {
    res.render('register');
  }
  else if (req.method === 'POST') {
    console.log('req.body :>> ', req.body);
    const shaObj = new jsSHA('SHA-512', 'TEXT', { encoding: 'UTF8' });
    // input the password from the req to the SHA object
    shaObj.update(req.body.password);
    // get the hashed password as output from the SHA object
    const hashedPassword = shaObj.getHash('HEX');

    // store the hashed password in our DB
    const values = [req.body.email, hashedPassword];
    const registerQuery = `INSERT INTO users (email, password)
                              VALUES         ($1, $2)`;
    pool.query(registerQuery, values, (err, result) => {
      if (err) throw err;
      console.log(result.rows);
      res.redirect('/login');
    });
  }
};

const userLogin = (req, res) => {
  console.log('User Login');
  if (req.method === 'GET') {
    res.render('login');
  }
  else if (req.method === 'POST') {
    // retrieve the user entry using their email
    const values = [req.body.email];
    pool.query('SELECT * from users WHERE email=$1', values, (error, result) => {
      // return if there is a query error
      if (error) {
        console.log('Error executing query', error.stack);
        res.status(503).send(result.rows);
        return;
      }

      // we didnt find a user with that email
      if (result.rows.length === 0) {
        // the error for incorrect email and incorrect password are the same for security reasons.
        // This is to prevent detection of whether a user has an account for a given service.
        res.status(403).send('invalid email');
        return;
      }

      // get user record from results
      const user = result.rows[0];
      // initialise SHA object
      let shaObj = new jsSHA('SHA-512', 'TEXT', { encoding: 'UTF8' });
      // input the password from the req to the SHA object
      shaObj.update(req.body.password);
      // get the hashed value as output from the SHA object
      const hashedPassword = shaObj.getHash('HEX');
      console.log('hashedPassword :>> ', hashedPassword);
      console.log('user.password :>> ', user.password);
      // If the user's hashed password in the database does not match the hashed input password, login fails
      if (user.password !== hashedPassword) {
        // the error for incorrect email and incorrect password are the same for security reasons.
        // This is to prevent detection of whether a user has an account for a given service.
        res.status(403).send('invalid password');
        return;
      }
      console.log('Successful Login');
      // create new SHA object
      shaObj = new jsSHA('SHA-512', 'TEXT', { encoding: 'UTF8' });
      // create an unhashed cookie string based on user ID and salt
      const unhashedCookieString = `${user.id}-${SALT}`;
      // generate a hashed cookie string using SHA object
      shaObj.update(unhashedCookieString);
      const hashedCookieString = shaObj.getHash('HEX');
      // set the loggedInHash and userId cookies in the res
      res.cookie('loggedInHash', hashedCookieString);
      res.cookie('userId', user.id);
      // end the req-res cycle
      res.redirect('/');
    });
  }
};

const createLaunch = (req, res) => {
  console.log('createLaunch');
  if (req.method === 'GET') {
    res.render('create');
  }
  else if (req.method === 'POST') {
    console.log('req.body :>> ', req.body);
    const createLaunchQuery = `INSERT INTO launches
                                        (launch_title, launch_info, launched_by, launch_qty, launch_price )
                                VALUES  (     $1,         $2,           $3,         $4,         $5        )
                                RETURNING *`;
    console.log('req.cookies.userId :>> ', req.cookies.userId);
    req.body.userId = req.cookies.userId;

    const values = [req.body.title, req.body.info, req.body.userId, req.body.quantity, req.body.price];
    req.body.values = values;
    pool.query(createLaunchQuery, values, (err, result) => {
      if (err) throw err;
      console.table(result.rows);
      res.send('event created');
    });
  }
};

const allLaunches = (req, res) => {
  console.log('All Launches');
  res.send('all');
};
