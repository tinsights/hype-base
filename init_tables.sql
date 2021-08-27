DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS launches CASCADE;
DROP TABLE IF EXISTS bids CASCADE;

CREATE TABLE IF NOT EXISTS  users
  (
    id            SERIAL PRIMARY KEY,
    email         TEXT NOT NULL UNIQUE,
    password      TEXT NOT NULL
  );

CREATE TABLE IF NOT EXISTS  launches
  (
    id            SERIAL PRIMARY KEY,
    launched_by   INTEGER REFERENCES users(id),
    launch_qty    INTEGER NOT NULL,
    launch_price  NUMERIC NOT NULL,
    is_active     BOOLEAN DEFAULT TRUE
  );

CREATE TABLE IF NOT EXISTS  bids
  (
    id            SERIAL,
    launch_id     INTEGER REFERENCES launches(id),
    bidder_id     INTEGER REFERENCES users(id),
    bid_price     NUMERIC NOT NULL,
    PRIMARY KEY (launch_id, bidder_id)
  )