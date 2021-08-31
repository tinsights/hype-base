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
    title         TEXT NOT NULL,
    info          TEXT NOT NULL,
    launched_by   INTEGER REFERENCES users(id),
    start_date    DATE DEFAULT NOW(),
    quantity      INTEGER NOT NULL,
    start_price   NUMERIC NOT NULL,
    current_price NUMERIC,
    is_active     BOOLEAN DEFAULT TRUE
  );

CREATE TABLE IF NOT EXISTS  bids
  (
    id            SERIAL,
    launch_id     INTEGER REFERENCES launches(id),
    bidder_id     INTEGER REFERENCES users(id),
    bid_price     NUMERIC NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    --PRIMARY KEY (launch_id, bidder_id)
  );