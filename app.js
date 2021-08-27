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
  app.get('/signup', registerUser);
  app.post('/signup', registerUser);
  // // user login, get-> login form, post-> submit form
  app.get('/login', userLogin);
  app.post('/login', userLogin);
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
}, 0)


const landingPage = (req, res) => {
  console.log("Landing Page");
  res.render('index');
}

const registerUser = (req, res) => {
  console.log("Register");
  res.send("Registration");
}

const userLogin = (req, res) => {
  console.log("User Login");
  res.send("User Login");
}

const createLaunch = (req, res) => {
  console.log("createLaunch");
  res.send("createLaunch");
}

const allLaunches = (req, res) => {
  console.log("All Launches");
  res.send("all launches");
}
