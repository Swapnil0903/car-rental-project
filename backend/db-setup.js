const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Path to the SQLite database file
const dbPath = path.join(__dirname, '../database/database.sqlite');
const db = new sqlite3.Database(dbPath);

// Initialize tables
db.serialize(() => {
  // Users Table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      mobile TEXT NOT NULL,
      password TEXT NOT NULL
    );
  `);

  // Vehicles Table
  db.run(`
    CREATE TABLE IF NOT EXISTS vehicles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      model TEXT NOT NULL,
      owner_id INTEGER NOT NULL,
      price INTEGER NOT NULL,
      location TEXT NOT NULL,
      availability_status INTEGER DEFAULT 1, -- 1: Available, 0: Not Available
      FOREIGN KEY(owner_id) REFERENCES users(id)
    );
  `);

  // Bookings Table
  db.run(`
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      vehicle_id INTEGER NOT NULL,
      from_date TEXT NOT NULL,
      to_date TEXT NOT NULL,
      status TEXT DEFAULT 'Pending',
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(vehicle_id) REFERENCES vehicles(id)
    );
  `);

  // Feedback Table
  db.run(`
    CREATE TABLE IF NOT EXISTS feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      message TEXT NOT NULL,
      rating INTEGER CHECK(rating >= 1 AND rating <= 5),
      response TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
  `);

  console.log('Database initialized!');
});

// Close the database connection
db.close();
