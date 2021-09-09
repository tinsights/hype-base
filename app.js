import express from 'express';
import pg from 'pg';
import methodOverride from 'method-override';
import cookieParser from 'cookie-parser';
import jsSHA from 'jssha';
import multer from 'multer';
import computeHistogram from 'compute-histogram';
import cron from 'cron';

const job = new cron.CronJob('* * * * * *', () => {
  refresh();
}, null, true, 'Asia/Singapore');
job.start();

const SALT = process.env.SALT || 'pepper pots';
const PORT = process.env.PORT || 3004;
const { Pool } = pg;
let pgConnectionConfigs;
if (process.env.ENV === 'PRODUCTION') {
  // determine how we connect to the remote Postgres server
  pgConnectionConfigs = {
    user: 'postgres',
    // set DB_PASSWORD as an environment variable for security.
    password: process.env.DB_PASSWORD,
    host: 'localhost',
    database: 'hypebase',
    port: 5432,
  };
} else {
  // determine how we connect to the local Postgres server
  pgConnectionConfigs = {
    user: 'tail',
    host: 'localhost',
    database: 'hypebase',
    port: 5432,
  };
}

const pool = new Pool(pgConnectionConfigs);

const app = express();

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.static('uploads'));
app.use(express.urlencoded({ extended: false }));
app.use(methodOverride('_method'));
app.use(cookieParser());

// set the name of the upload directory here
const multerUpload = multer({ dest: 'uploads/' });

setTimeout(() => {
  // landing page (not sure what goes here for now)
  app.get('/', landingPage);
  // user registration, get-> signup form, post-> submit form
  app.get('/signup', userRegister);
  app.post('/signup', userRegister);
  // user login, get-> login form, post-> submit form
  app.get('/login', userLogin);
  app.post('/login', userLogin);
  // app.delete('/logout', userLogout);
  // create a launch, get-> creation form, post-> submit form
  app.get('/create-launch', createLaunch);
  app.post('/create-launch', multerUpload.single('photo'), createLaunch);
  // view a launch, access submit-bid form
  app.get('/launch', allLaunches);
  app.get('/launch/:id', viewLaunch);
  // submit a bid for a launch
  app.post('/launch/:id/bid', submitBid);
  app.use((req, res) => {
    res.status(404).send('404 NOT FOUND');
  });

  app.listen(PORT);
}, 0);

const getHash = (input) => {
  // create new SHA object
  const shaObj = new jsSHA('SHA-512', 'TEXT', { encoding: 'UTF8' });

  // create an unhashed cookie string based on user ID and salt
  const unhashedString = `${input}-${SALT}`;

  // generate a hashed cookie string using SHA object
  shaObj.update(unhashedString);

  return shaObj.getHash('HEX');
};

app.use((request, response, next) => {
  // set the default value
  request.isUserLoggedIn = false;

  // check to see if the cookies you need exists
  if (request.cookies.loggedInHash && request.cookies.userId) {
    // get the hased value that should be inside the cookie
    const hash = getHash(request.cookies.userId);

    // test the value of the cookie
    if (request.cookies.loggedInHash === hash) {
      request.isUserLoggedIn = true;

      // look for this user in the database
      const values = [request.cookies.userId];

      // try to get the user
      pool.query('SELECT * FROM users WHERE id=$1', values, (error, result) => {
        if (error || result.rows.length < 1) {
          response.status(503).send('sorry!');
          return;
        }

        // set the user as a key in the request object so that it's accessible in the route
        request.user = result.rows[0];

        next();
      });

      // make sure we don't get down to the next() below
      return;
    }
  }

  next();
});

const landingPage = (req, res) => {
  console.log('Landing Page');
  res.render('index');
};

const userRegister = (req, res) => {
  console.log('Register');
  if (req.isUserLoggedIn === true) {
    res.redirect('/');
    return;
  }
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
    const values = [req.body.email, req.body.username, hashedPassword];
    const registerQuery = `INSERT INTO users (email, username, password)
                              VALUES         ($1,$2,$3)`;
    pool.query(registerQuery, values, (err, result) => {
      if (err) throw err;
      console.log(result.rows);
      res.redirect('/login');
    });
  }
};

const userLogin = (req, res) => {
  console.log('User Login');
  if (req.isUserLoggedIn === true) {
    res.redirect('/');
    return;
  }
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
  if (!req.isUserLoggedIn) {
    res.redirect('/login');
    return;
  }
  console.log('createLaunch');
  if (req.method === 'GET') {
    res.render('create');
  }
  else if (req.method === 'POST') {
    console.log('req.body :>> ', req.body);
    const createLaunchQuery = `INSERT INTO launches
                              (title, info, launched_by, quantity, start_price, current_price, end_date, photo)
                              VALUES  ($1,$2,$3,$4,$5,$5,$6,$7)
                              RETURNING id`;
    console.log('req.cookies.userId :>> ', req.cookies.userId);
    req.body.userId = req.cookies.userId;

    const values = [
      req.body.title,
      req.body.info,
      req.body.userId,
      req.body.quantity,
      req.body.price,
      req.body.endDate,
      req.file.filename,
    ];
    req.body.values = values;
    pool.query(createLaunchQuery, values, (err, result) => {
      if (err) throw err;
      console.table(result.rows);
      const { id } = result.rows[0];
      console.log(id);
      res.redirect(`/launch/${id}`);
    });
  }
};

const allLaunches = (req, res) => {
  console.log('All Launches');
  pool.query('SELECT * FROM launches', (err, result) => {
    const launches = result.rows;
    const content = {
      launches,
    };
    res.render('all', content);
  });
};

const viewLaunch = (req, res) => {
  if (!req.isUserLoggedIn) {
    res.redirect('/login');
    return;
  }
  const { id } = req.params;
  console.log(`Going to launch ${id}`);
  // get launch details
  Promise.all([
    pool.query(`SELECT * FROM launches WHERE id = ${id}`),
    pool.query(`SELECT * FROM bids INNER JOIN users ON bidder_id = users.id WHERE launch_id = ${id}`),
  ]).then((result) => {
    const launch = result[0].rows[0];
    const bidResult = result[1].rows;
    const bids = bidResult.map((bidsObj) => bidsObj.bid_price);
    // const bidHist = computeHistogram(bids);
    // console.log('bidHist :>> ', bidHist);
    const content = {
      launch,
      bids,
      bidResult,
    };
    res.render('launch', content);
  });
};

const submitBid = (req, res) => {
  const { id } = req.params;
  const { bid } = req.body;
  const { userId } = req.cookies;
  let bidId;
  let bidPriceArr;
  let bidCount;
  let currPrice;
  let minBid;
  let launchQty;
  console.log(`Received ${bid} for launch ${req.params.id}`);
  // count the current number of bids for launch
  pool.query(`INSERT INTO bids (launch_id, bidder_id, bid_price) VALUES (${id}, ${userId}, ${bid}) RETURNING id`)
    .then((result) => {
      bidId = result.rows[0].id;
      return pool.query(`SELECT * FROM bids where launch_id = ${id}`);
    })
    .then((result) => {
      // console.log('bidId :>> ', bidId);
      // console.table(result.rows);
      bidPriceArr = result.rows.map((bidData) => bidData.bid_price);
      bidCount = bidPriceArr.length;
      return pool.query(`SELECT * FROM launches WHERE id = ${id}`);
    })
    .then((result) => {
      launchQty = result.rows[0].quantity;
      currPrice = result.rows[0].current_price;
      console.log(`There are currently ${bidCount} bids for ${launchQty} items.`);
      minBid = currPrice;
      if (bidCount >= launchQty) {
        console.log('Updating price');
        minBid = lowestBid(bidPriceArr, launchQty);
        console.log('minBid :>> ', minBid);
        pool.query(`UPDATE launches SET current_price = ${minBid} WHERE id = ${id}`);
      }
      pool.query(`UPDATE bids SET price_floor = ${minBid} WHERE id = ${bidId}`);
    })
    .then((result) => {
      res.redirect(`/launch/${id}`);
    })
    .catch((err) => console.log(err.stack));
};

const lowestBid = (bids, quantity) => {
  const sortedBidsArr = bids.sort((a, b) => b - a);
  console.log('sortedBidsArr :>> ', sortedBidsArr);
  return sortedBidsArr[quantity - 1];
};

const refresh = () => {
  pool.query('SELECT * FROM launches')
    .then((results) => {
      const launchArr = results.rows;
      launchArr.forEach((launch) => {
        if (launch.is_active
          && (Date.parse(launch.end_date) - Date.now()) <= 0) {
          console.log(`${launch.title} ended.`);
          Promise.all([
            pool.query(`UPDATE launches SET is_active = false WHERE id = ${launch.id} RETURNING quantity`),
            pool.query(`SELECT * FROM bids WHERE launch_id = ${launch.id}`),
          ])
            .then((results) => {
              const { quantity } = results[0].rows[0];
              const bidsArr = results[1].rows;
              selectWinners(launch.id, quantity, bidsArr);
            });
        }
      });
    });
};

const selectWinners = (id, qty, bids) => {
  const bidCount = bids.length;
  const sortedBids = bids.sort((a, b) => b.bid_price - a.bid_price);
  console.log('sortedBids :>> ', sortedBids);
  let minBid = 0;
  if (bidCount >= qty) {
    minBid = sortedBids[qty - 1].bid_price;
  }
  console.log('minBid :>> ', minBid);
  pool.query(`UPDATE bids
              SET qualified = TRUE
              WHERE launch_id = ${id}
              AND
              bid_price >= ${minBid}`);
};
