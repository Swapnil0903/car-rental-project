document.addEventListener("DOMContentLoaded", () => {
  // Function to format date to dd/mm/yyyy
function formatToDate(rawDate) {
  const date = new Date(rawDate);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

  const loginForm = document.getElementById("login-form");
  const usernameDisplay = document.getElementById("username-display");
  const profileForm = document.getElementById("profile-form");
  const vehicleForm = document.getElementById("vehicle-form");
  const myVehicleList = document.getElementById("my-vehicle-list");
  const vehicleList = document.getElementById("vehicle-container");
  const bookingList = document.getElementById("booking-list");
  const bookingModal = document.getElementById("booking-modal");
  const toast = document.getElementById("toast");

  const navLinks = document.querySelectorAll(".nav-link");
  const sections = document.querySelectorAll("main > section");

  const dashboardSection = document.getElementById("dashboard");
  const registerVehicleButton = document.querySelector(".btn-success");
  const browseVehiclesButton = document.querySelector(".btn-primary");
  let selectedVehicleId = null;

  console.log("dashboardSection:", dashboardSection);
  console.log("sections:", sections);
  console.log("navLinks:", navLinks);
  console.log("registerVehicleButton:", registerVehicleButton);
  console.log("browseVehiclesButton:", browseVehiclesButton);
  const profileLink = document.querySelector(".dropdown-menu li a[href='#profile']");
  const logoutLink = document.querySelector(".dropdown-menu li a[href='#logout']");

  // Handle "Profile" Click
  if (profileLink) {
    profileLink.addEventListener("click", (e) => {
      e.preventDefault();
      navigateTo("profile"); // Navigate to profile section
    });
  }

  // Handle "Logout" Click
  if (logoutLink) {
    logoutLink.addEventListener("click", (e) => {
      e.preventDefault();
      localStorage.removeItem("username"); // Clear user data
      window.location.href = "index.html"; // Redirect to login page
    });
  }
  // Only proceed if all critical elements exist
  if (dashboardSection && sections && navLinks) {
    // Define navigateTo function globally
    window.navigateTo = function (sectionId) {
      console.log("Navigating to:", sectionId);
      const targetSection = document.getElementById(sectionId);

      if (targetSection) {
        sections.forEach((section) => section.classList.add("hidden")); // Hide all sections
        targetSection.classList.remove("hidden"); // Show target section
        console.log("Visible Section:", targetSection.id);

        // Trigger data loading based on section
        if (sectionId === "vehicle-list") loadVehicles();
        if (sectionId === "my-vehicles") loadMyVehicles();
        if (sectionId === "booking-list") loadBookings();
      } else {
        console.error("Section not found:", sectionId);
      }
    };
   
    // Navigate to My Vehicles (Registration)
    if (registerVehicleButton) {
      registerVehicleButton.addEventListener("click", (e) => {
        e.preventDefault();
        navigateTo("my-vehicles");
      });
    }

    // Navigate to Available Vehicles (Browse)
    if (browseVehiclesButton) {
      browseVehiclesButton.addEventListener("click", (e) => {
        e.preventDefault();
        navigateTo("vehicle-list");
      });
    }

    // Handle Navigation via Links
    navLinks.forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const targetId = link.getAttribute("href").substring(1);
        console.log("Navigating via Link to:", targetId);
        navigateTo(targetId);
      });
    });

    // Default: Show the dashboard section on page load
    sections.forEach((section) => section.classList.add("hidden"));
    dashboardSection.classList.remove("hidden");
  } else {
    console.error("Required elements for dashboard logic are missing.");
  }
  

  // Show Toast Notifications
  function showToast(message, isError = false) {
    if (toast) {
      toast.textContent = message;
      toast.style.backgroundColor = isError ? "#e74c3c" : "#4CAF50";
      toast.classList.remove("hidden");
      setTimeout(() => toast.classList.add("hidden"), 3000);
    }
  }

  // Handle Login
  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const username = document.getElementById("username").value;
      const password = document.getElementById("password").value;

      if (username && password) {
        localStorage.setItem("username", username);
        window.location.href = "user-dashboard.html";
      } else {
        showToast("Please fill in all fields.", true);
      }
    });
  }

  // Load Username
  if (usernameDisplay) {
    const username = localStorage.getItem("username");
    usernameDisplay.textContent = username || "User";
  }

  // Load Profile
  if (profileForm) {
    fetch("/api/profile")
      .then((res) => res.json())
      .then((data) => {
        document.getElementById("profile-name").value = data.name;
        document.getElementById("profile-email").value = data.email;
        document.getElementById("profile-mobile").value = data.mobile;
      })
      .catch((err) => {
        console.error("Error loading profile:", err);
        showToast("Failed to load profile. Please try again.", true);
      });

    profileForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = document.getElementById("profile-name").value;
      const email = document.getElementById("profile-email").value;
      const mobile = document.getElementById("profile-mobile").value;

      fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, mobile }),
      })
        .then((res) => res.json())
        .then((data) => showToast(data.message || "Profile updated successfully!"))
        .catch((err) => {
          console.error("Error updating profile:", err);
          showToast("Failed to update profile. Please try again.", true);
        });
    });
  }

  // Load My Vehicles
  function loadMyVehicles() {
    if (myVehicleList) {
      myVehicleList.innerHTML = '<p class="loading">Loading your vehicles...</p>';
      fetch("/api/my-vehicles")
        .then((res) => res.json())
        .then((vehicles) => {
          if (vehicles.length === 0) {
            myVehicleList.innerHTML = "<p>No vehicles found. Add your first vehicle!</p>";
          } else {
            myVehicleList.innerHTML = vehicles
              .map(
                (v) => `
                  <div class="card">
                    <h3>${v.model}</h3>
                    <p>Price: ₹${v.price}</p>
                    <p>Location: ${v.location}</p>
                    <p>Registration Number: ${v.registration_number || "NOT_PROVIDED"}</p>
                    <button class="btn btn-danger" onclick="deleteVehicle(${v.id})">Delete</button>
                  </div>
                `
              )
              .join("");
          }
        })
        .catch((err) => {
          console.error("Error loading your vehicles:", err);
          myVehicleList.innerHTML = "<p class='error'>Failed to load your vehicles. Please try again later.</p>";
        });
    }
  }

  // Load Available Vehicles
  function loadVehicles() {
    if (vehicleList) {
      vehicleList.innerHTML = '<p class="loading">Loading vehicles...</p>';
      fetch("/api/vehicles")
        .then((res) => res.json())
        .then((vehicles) => {
          if (vehicles.length === 0) {
            vehicleList.innerHTML = "<p>No vehicles available at the moment. Please check back later.</p>";
          } else {
            vehicleList.innerHTML = vehicles
              .map(
                (v) => `
                  <div class="card">
                    <h3>${v.model}</h3>
                    <p>Price: ₹${v.price} per day</p>
                    <p>Location: ${v.location}</p>
                    <p>Registration Number: ${v.registration_number || "NOT_PROVIDED"}</p>
                    <button class="btn btn-primary" onclick="openBookingModal(${v.id})">Book Now</button>
                  </div>
                `
              )
              .join("");
          }
        })
        .catch((err) => {
          console.error("Error loading vehicles:", err);
          vehicleList.innerHTML = "<p class='error'>Failed to load vehicles. Please try again later.</p>";
        });
    }
  }

  // Add Vehicle
  if (vehicleForm) {
    vehicleForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const model = document.getElementById("vehicle-model").value;
      const price = document.getElementById("vehicle-price").value;
      const location = document.getElementById("vehicle-location").value;
      const registrationNumber = document.getElementById("vehicle-registration-number").value;
      const vehicleNumber = document.getElementById("vehicle-number").value;

      fetch("/api/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, price, location, registration_number: registrationNumber, vehicle_number: vehicleNumber }),
      })
        .then((res) => res.json())
        .then((data) => {
          showToast(data.message || "Vehicle added successfully!");
          loadMyVehicles();
        })
        .catch((err) => {
          console.error("Error adding vehicle:", err);
          showToast("Failed to add vehicle. Please try again.", true);
        });
    });
  }

  // Delete Vehicle
  window.deleteVehicle = (id) => {
    fetch(`/api/vehicles/${id}`, { method: "DELETE" })
      .then((res) => res.json())
      .then((data) => {
        showToast(data.message || "Vehicle deleted successfully!");
        loadMyVehicles();
      })
      .catch((err) => {
        console.error("Error deleting vehicle:", err);
        showToast("Failed to delete vehicle. Please try again.", true);
      });
  };

  // Open Booking Modal
window.openBookingModal = (vehicleId) => {
  selectedVehicleId = vehicleId;
  bookingModal.innerHTML = `
    <div class="modal-content">
      <h2>Book Vehicle</h2>
      <form id="booking-form">
        <label for="from-date">From Date:</label>
        <input type="date" id="from-date" required>
        <label for="to-date">To Date:</label>
        <input type="date" id="to-date" required>
        <button type="submit" class="btn btn-success">Confirm Booking</button>
        <button type="button" class="btn btn-danger" onclick="closeBookingModal()">Cancel</button>
      </form>
    </div>
  `;
  bookingModal.classList.remove("hidden");

  document.getElementById("booking-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const fromDateRaw = document.getElementById("from-date").value;
    const toDateRaw = document.getElementById("to-date").value;

    // Format dates
    const fromDate = formatToDate(fromDateRaw);
    const toDate = formatToDate(toDateRaw);

    if (new Date(fromDateRaw) >= new Date(toDateRaw)) {
      showToast("Invalid date range. Please select valid dates.", true);
      return;
    }

    fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vehicle_id: selectedVehicleId, from_date: fromDate, to_date: toDate }),
    })
      .then((res) => res.json())
      .then((data) => {
        showToast(data.message || "Vehicle booked successfully!");
        closeBookingModal();
        loadBookings();
      })
      .catch((err) => {
        console.error("Error booking vehicle:", err);
        showToast("Failed to book vehicle. Please try again.", true);
      });
  });
};

  // Close Booking Modal
  window.closeBookingModal = () => {
    bookingModal.innerHTML = "";
    bookingModal.classList.add("hidden");
  };

  // Load Bookings
function loadBookings() {
  if (bookingList) {
    bookingList.innerHTML = '<p class="loading">Loading bookings...</p>';
    fetch("/api/bookings")
      .then((res) => res.json())
      .then((bookings) => {
        if (bookings.length === 0) {
          bookingList.innerHTML = "<p>No bookings found. Book your first vehicle now!</p>";
        } else {
          bookingList.innerHTML = bookings
            .map(
              (b) => `
                <div class="card">
                  <h3>${b.vehicle_model}</h3>
                  <p>From: ${formatToDate(b.from_date)}</p> <!-- Highlighted Change -->
                  <p>To: ${formatToDate(b.to_date)}</p> <!-- Highlighted Change -->
                  <button class="btn btn-danger" onclick="cancelBooking(${b.id})">Cancel</button>
                </div>
              `
            )
            .join("");
        }
      })
      .catch((err) => {
        console.error("Error loading bookings:", err);
        bookingList.innerHTML = "<p class='error'>Failed to load bookings. Please try again later.</p>";
      });
  }
}
// Apply Filters for Locations
function applyFilters() {
  const source = document.getElementById("filter-source").value;
  const destination = document.getElementById("filter-destination").value;

  fetch(`/api/vehicles?source=${source}&destination=${destination}`)
    .then((res) => res.json())
    .then((vehicles) => {
      if (vehicles.length === 0) {
        vehicleList.innerHTML = "<p>No vehicles available for the selected locations.</p>";
      } else {
        vehicleList.innerHTML = vehicles
          .map(
            (v) => `
              <div class="card">
                <h3>${v.model}</h3>
                <p>Price: ₹${v.price} per day</p>
                <p>Current Location: ${v.location}</p>
                <p>Available In: ${v.target_location}</p>
                <button class="btn btn-primary" onclick="openBookingModal(${v.id})">Book Now</button>
              </div>
            `
          )
          .join("");
      }
    })
    .catch((err) => {
      console.error("Error filtering vehicles:", err);
      vehicleList.innerHTML = "<p>Failed to filter vehicles. Please try again later.</p>";
    });
}


  // Cancel Booking
  window.cancelBooking = (id) => {
    fetch(`/api/bookings/${id}`, { method: "DELETE" })
      .then((res) => res.json())
      .then((data) => {
        showToast(data.message || "Booking canceled successfully!");
        loadBookings();
      })
      .catch((err) => {
        console.error("Error canceling booking:", err);
        showToast("Failed to cancel booking. Please try again.", true);
      });
  };

  // Initial Load
  loadVehicles();
  loadBookings();
  loadMyVehicles();
});
