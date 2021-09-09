DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA IF NOT EXISTS public;

CREATE TABLE IF NOT EXISTS  users
  (
    id            SERIAL PRIMARY KEY,
    email         TEXT NOT NULL UNIQUE,
    username      VARCHAR(12),
    password      TEXT NOT NULL
  );

CREATE TABLE IF NOT EXISTS  launches
  (
    id            SERIAL PRIMARY KEY,
    title         TEXT NOT NULL,
    summary       TEXT NOT NULL,
    info          TEXT NOT NULL,
    launched_by   INTEGER REFERENCES users(id),
    start_date    TIMESTAMPTZ DEFAULT NOW(),
    end_date      TIMESTAMPTZ,
    quantity      INTEGER NOT NULL,
    start_price   NUMERIC NOT NULL,
    current_price NUMERIC,
    photo         TEXT,
    is_active     BOOLEAN DEFAULT TRUE
  );

CREATE TABLE IF NOT EXISTS  bids
  (
    id            SERIAL PRIMARY KEY,
    launch_id     INTEGER REFERENCES launches(id),
    bidder_id     INTEGER REFERENCES users(id),
    bid_price     NUMERIC NOT NULL,
    price_floor   NUMERIC,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    qualified     BOOLEAN DEFAULT false
    --PRIMARY KEY (launch_id, bidder_id)
  );
