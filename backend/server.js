const express = require("express");
const path = require("path");
const Database = require("better-sqlite3"); // Importing better-sqlite3

const app = express();

// Use dynamic port for deployment compatibility
const PORT = process.env.PORT || 3000; // Use Render-assigned PORT if available

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, "../public")));
console.log("Serving static files from:", path.join(__dirname, "../public"));

// Database Connection
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, "../database/database.sqlite");
const db = new Database(dbPath, { verbose: console.log }); // Verbose logs SQL queries
console.log(`Connected to SQLite database at ${dbPath}`);

/** Health Check Route **/
app.get("/healthz", (req, res) => {
  res.status(200).send("OK");
});

/** Profile Management APIs **/
app.get("/api/profile", (req, res) => {
  const userId = 1; // Replace with session-based user ID in a real app
  const query = "SELECT name, email, mobile FROM users WHERE id = ?";
  try {
    const row = db.prepare(query).get(userId); // better-sqlite3 uses `.prepare().get()`
    res.status(200).json(row || {});
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Failed to fetch profile." });
  }
});

/** Vehicle Management APIs **/

// Add vehicle
app.post("/api/vehicles", (req, res) => {
  const ownerId = 1; // Replace with session-based user ID in a real app
  const { model, price, location, registration_number, vehicle_number } = req.body;

  if (!model || !price || !location || !registration_number || !vehicle_number) {
    return res.status(400).json({ message: "All fields are required." });
  }

  try {
    const query = `
      INSERT INTO vehicles (model, owner_id, price, location, registration_number, vehicle_number, availability_status)
      VALUES (?, ?, ?, ?, ?, ?, 'Available')
    `;
    const stmt = db.prepare(query);
    const info = stmt.run(model, ownerId, price, location, registration_number, vehicle_number);
    res.status(201).json({ message: "Vehicle registered successfully!", vehicleId: info.lastInsertRowid });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Failed to add vehicle." });
  }
});

// Get all available vehicles
app.get("/api/vehicles", (req, res) => {
  try {
    const query = "SELECT * FROM vehicles WHERE availability_status = 'Available'";
    const rows = db.prepare(query).all();
    res.status(200).json(rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Failed to fetch vehicles." });
  }
});

// Get vehicles owned by the user
app.get("/api/my-vehicles", (req, res) => {
  const ownerId = 1; // Replace with session-based user ID in a real app
  try {
    const query = "SELECT * FROM vehicles WHERE owner_id = ?";
    const rows = db.prepare(query).all(ownerId);
    res.status(200).json(rows || []);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Failed to fetch vehicles." });
  }
});

/** Booking Management APIs **/

// Book a vehicle
app.post("/api/bookings", (req, res) => {
  const { user_id, vehicle_id, from_date, to_date } = req.body;

  if (!user_id || !vehicle_id || !from_date || !to_date) {
    return res.status(400).json({ message: "All fields are required." });
  }

  try {
    const checkQuery = "SELECT availability_status FROM vehicles WHERE id = ?";
    const vehicle = db.prepare(checkQuery).get(vehicle_id);

    if (!vehicle || vehicle.availability_status !== "Available") {
      return res.status(400).json({ message: "Vehicle is not available for booking." });
    }

    const bookingQuery = `
      INSERT INTO bookings (user_id, vehicle_id, from_date, to_date)
      VALUES (?, ?, ?, ?)
    `;
    const stmt = db.prepare(bookingQuery);
    const info = stmt.run(user_id, vehicle_id, from_date, to_date);

    const updateQuery = "UPDATE vehicles SET availability_status = 'Booked' WHERE id = ?";
    db.prepare(updateQuery).run(vehicle_id);

    res.status(201).json({ message: "Booking created successfully!", bookingId: info.lastInsertRowid });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Failed to create booking." });
  }
});

// Get all bookings
app.get("/api/bookings", (req, res) => {
  try {
    const query = `
      SELECT bookings.id, vehicles.model AS vehicle_model, bookings.from_date, bookings.to_date
      FROM bookings
      JOIN vehicles ON bookings.vehicle_id = vehicles.id
    `;
    const rows = db.prepare(query).all();
    res.status(200).json(rows || []);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Failed to fetch bookings." });
  }
});

// Cancel a booking
app.delete("/api/bookings/:id", (req, res) => {
  const { id } = req.params;

  try {
    const getVehicleQuery = "SELECT vehicle_id FROM bookings WHERE id = ?";
    const booking = db.prepare(getVehicleQuery).get(id);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found." });
    }

    const deleteQuery = "DELETE FROM bookings WHERE id = ?";
    db.prepare(deleteQuery).run(id);

    const updateQuery = "UPDATE vehicles SET availability_status = 'Available' WHERE id = ?";
    db.prepare(updateQuery).run(booking.vehicle_id);

    res.status(200).json({ message: "Booking canceled successfully!" });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Failed to cancel booking." });
  }
});

// Default Route for Missing APIs
app.use((req, res) => {
  res.status(404).json({ message: "Endpoint not found" });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`); // Reflect dynamic port in logs
});
