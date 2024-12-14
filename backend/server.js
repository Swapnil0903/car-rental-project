const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();

// Use dynamic port for deployment compatibility
const PORT = process.env.PORT || 3000; // Fix: Use Render-assigned PORT if available

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, "../public"))); // Fix: Ensure static files are served correctly
console.log("Serving static files from:", path.join(__dirname, "../public"));

// Database Connection
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, "../database/database.sqlite"); // Fix: Add option for Render Disks
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Error connecting to the database:", err.message);
  } else {
    console.log(`Connected to SQLite database at ${dbPath}`);
  }
});

// Add optional SQL trace logs for debugging (Render-specific)
db.on("trace", (sql) => {
  console.log(`Executing SQL: ${sql}`);
});
db.on("profile", (sql, time) => {
  console.log(`Executed SQL: ${sql} in ${time}ms`);
});

/** Health Check Route **/
app.get("/healthz", (req, res) => {
  // Fix: Health check for Render to ensure service is running
  res.status(200).send("OK");
});

/** Profile Management APIs **/

app.get("/api/profile", (req, res) => {
  const userId = 1; // Replace with session-based user ID in a real app
  const query = "SELECT name, email, mobile FROM users WHERE id = ?";
  db.get(query, [userId], (err, row) => {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ message: "Failed to fetch profile." });
    }
    res.status(200).json(row || {});
  });
});

/** Vehicle Management APIs **/

// Add vehicle (Updated to include `registration_number` and `vehicle_number`)
app.post("/api/vehicles", (req, res) => {
  const ownerId = 1; // Replace with session-based user ID in a real app
  const { model, price, location, registration_number, vehicle_number } = req.body;

  if (!model || !price || !location || !registration_number || !vehicle_number) {
    return res.status(400).json({ message: "All fields are required." });
  }

  const query = `
    INSERT INTO vehicles (model, owner_id, price, location, registration_number, vehicle_number, availability_status)
    VALUES (?, ?, ?, ?, ?, ?, 'Available')
  `;
  db.run(query, [model, ownerId, price, location, registration_number, vehicle_number], function (err) {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ message: "Failed to add vehicle." });
    }
    res.status(201).json({ message: "Vehicle registered successfully!", vehicleId: this.lastID });
  });
});

// Get all available vehicles
app.get("/api/vehicles", (req, res) => {
  const query = "SELECT * FROM vehicles WHERE availability_status = 'Available'";
  db.all(query, [], (err, rows) => {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ message: "Failed to fetch vehicles." });
    }
    res.status(200).json(rows);
  });
});

// Get vehicles owned by the user
app.get("/api/my-vehicles", (req, res) => {
  const ownerId = 1; // Replace with session-based user ID in a real app
  const query = "SELECT * FROM vehicles WHERE owner_id = ?";
  db.all(query, [ownerId], (err, rows) => {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ message: "Failed to fetch vehicles." });
    }
    res.status(200).json(rows || []);
  });
});

/** Booking Management APIs **/

// Book a vehicle
app.post("/api/bookings", (req, res) => {
  const { user_id, vehicle_id, from_date, to_date } = req.body;

  if (!user_id || !vehicle_id || !from_date || !to_date) {
    return res.status(400).json({ message: "All fields are required." });
  }

  // Check if the vehicle is available
  const checkQuery = `SELECT availability_status FROM vehicles WHERE id = ?`;
  db.get(checkQuery, [vehicle_id], (err, row) => {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ message: "Error checking vehicle availability." });
    }

    if (!row || row.availability_status !== "Available") {
      return res.status(400).json({ message: "Vehicle is not available for booking." });
    }

    // Proceed with booking
    const bookingQuery = `
      INSERT INTO bookings (user_id, vehicle_id, from_date, to_date)
      VALUES (?, ?, ?, ?)
    `;
    db.run(bookingQuery, [user_id, vehicle_id, from_date, to_date], function (err) {
      if (err) {
        console.error(err.message);
        return res.status(500).json({ message: "Failed to create booking." });
      }

      // Update the vehicle's availability status
      const updateQuery = `UPDATE vehicles SET availability_status = 'Booked' WHERE id = ?`;
      db.run(updateQuery, [vehicle_id], function (err) {
        if (err) {
          console.error(err.message);
          return res.status(500).json({ message: "Failed to update vehicle status." });
        }

        res.status(201).json({ message: "Booking created successfully!", bookingId: this.lastID });
      });
    });
  });
});

// Get all bookings
app.get("/api/bookings", (req, res) => {
  const query = `
    SELECT bookings.id, vehicles.model AS vehicle_model, bookings.from_date, bookings.to_date
    FROM bookings
    JOIN vehicles ON bookings.vehicle_id = vehicles.id
  `;
  db.all(query, [], (err, rows) => {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ message: "Failed to fetch bookings." });
    }
    res.status(200).json(rows || []);
  });
});

// Cancel a booking and update vehicle status
app.delete("/api/bookings/:id", (req, res) => {
  const { id } = req.params;

  // Get the vehicle ID associated with the booking
  const getVehicleQuery = `SELECT vehicle_id FROM bookings WHERE id = ?`;
  db.get(getVehicleQuery, [id], (err, row) => {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ message: "Error fetching booking details." });
    }

    if (!row) {
      return res.status(404).json({ message: "Booking not found." });
    }

    const vehicleId = row.vehicle_id;

    // Delete the booking
    const deleteQuery = "DELETE FROM bookings WHERE id = ?";
    db.run(deleteQuery, [id], function (err) {
      if (err) {
        console.error(err.message);
        return res.status(500).json({ message: "Failed to cancel booking." });
      }

      // Update the vehicle's availability status
      const updateQuery = `UPDATE vehicles SET availability_status = 'Available' WHERE id = ?`;
      db.run(updateQuery, [vehicleId], function (err) {
        if (err) {
          console.error(err.message);
          return res.status(500).json({ message: "Failed to update vehicle status." });
        }

        res.status(200).json({ message: "Booking canceled successfully!" });
      });
    });
  });
});

// Default Route for Missing APIs
app.use((req, res) => {
  res.status(404).json({ message: "Endpoint not found" });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`); // Fix: Reflect dynamic port in logs
});
