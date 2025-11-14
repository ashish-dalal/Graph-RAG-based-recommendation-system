import React, { useState, useEffect, useRef } from "react";
import './TextBox.css';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const TextBox = ({ updateUserData }) => {
  const [existing_destinations, setExistingDestinations] = useState([]);
  const [userData, setUserData] = useState({
    source: "",
    destination: "",
    customDestination: "",
    departureDate: null,
    returnDate: null,
    budget: "",
    description: "",
  });

  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredDestinations, setFilteredDestinations] = useState([]);
  const [showCustomField, setShowCustomField] = useState(false);
  const dropdownRef = useRef(null);

  // Fetch destinations when component mounts
  useEffect(() => {
    const fetchDestinations = async () => {
      try {
        const response = await fetch("http://localhost:5001/api/places");
        const destinations = await response.json();
        console.log("Fetched destinations:", destinations);
        setExistingDestinations(destinations);
      } catch (error) {
        console.error("Error fetching places:", error);
        setExistingDestinations([]);
      }
    };
    
    fetchDestinations();
  }, []);

  // Filter destinations based on input
  useEffect(() => {
    if (userData.destination === "") {
      setFilteredDestinations([]);
      return;
    }

    const filtered = existing_destinations.filter(dest => 
      dest.toLowerCase().includes(userData.destination.toLowerCase())
    );
    
    // Add "Other (It may take 3-4 minutes to generate the Graph" option if there are no matches or input doesn't exactly match any destination
    const exactMatch = existing_destinations.some(
      dest => dest.toLowerCase() === userData.destination.toLowerCase()
    );
    
    if (filtered.length === 0 || !exactMatch) {
      setFilteredDestinations([...filtered, "Other (It may take 3-4 minutes to generate the Graph"]);
    } else {
      setFilteredDestinations(filtered);
    }
  }, [userData.destination, existing_destinations]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleInputChange = (field, value) => {
    let updatedUserData = { ...userData, [field]: value };
    
    // If changing destination field, show dropdown
    if (field === "destination") {
      setShowDropdown(true);
      // If "Other (It may take 3-4 minutes to generate the Graph" was previously selected but now typing, reset custom field
      if (showCustomField && value !== "Other (It may take 3-4 minutes to generate the Graph") {
        setShowCustomField(false);
        updatedUserData = { ...updatedUserData, customDestination: "" };
      }
    }
    
    // For departure date changes, reset return date if it's before the new departure date
    if (field === "departureDate" && updatedUserData.returnDate && value > updatedUserData.returnDate) {
      updatedUserData.returnDate = null;
    }
    
    setUserData(updatedUserData);
    
    // Only send the final destination value to parent
    const dataToUpdate = { ...updatedUserData };
    if (showCustomField && updatedUserData.customDestination) {
      dataToUpdate.destination = updatedUserData.customDestination;
    }
    
    updateUserData(dataToUpdate);
  };

  const handleDestinationSelect = (destination) => {
    if (destination === "Other (It may take 3-4 minutes to generate the Graph") {
      setShowCustomField(true);
      setUserData({ ...userData, destination: "Other (It may take 3-4 minutes to generate the Graph" });
    } else {
      setShowCustomField(false);
      setUserData({ ...userData, destination, customDestination: "" });
      updateUserData({ ...userData, destination });
    }
    setShowDropdown(false);
  };

  const today = new Date();

  return (
    <div className="form-section">
      <div className="form-content" style={{ marginTop: '0px' }}>
        <h1 className="form-title">Travel Discover</h1>
        <p className="form-description">
          If you are looking for inspiration and authentic holiday experiences
          tailored to your needs, you've come to the right place.
        </p>
        <div>
          <label htmlFor="source" className="Form-label">Source Location</label>
          <input
            type="text"
            id="source"
            className="Form-input"
            placeholder="Enter the Source"
            value={userData.source}
            onChange={(e) => handleInputChange("source", e.target.value)}
          />
        </div>
        <div className="destination-container" style={{ position: "relative" }}>
          <label htmlFor="destination" className="Form-label">Destination Location</label>
          <input
            type="text"
            id="destination"
            className="Form-input"
            placeholder="Enter the Destination"
            value={userData.destination}
            onChange={(e) => handleInputChange("destination", e.target.value)}
            onFocus={() => setShowDropdown(true)}
          />
          
          {showDropdown && filteredDestinations.length > 0 && (
            <div 
              ref={dropdownRef}
              className="destination-dropdown" 
              style={{
                position: "absolute",
                width: "100%",
                maxHeight: "200px",
                overflowY: "auto",
                backgroundColor: "white",
                border: "1px solid #ddd",
                borderTop: "none",
                zIndex: 10,
                borderRadius: "0 0 4px 4px"
              }}
            >
              {filteredDestinations.map((dest, index) => (
                <div 
                  key={index}
                  className="dropdown-item"
                  style={{
                    color: "black",
                    padding: "8px 12px",
                    cursor: "pointer",
                    borderBottom: index !== filteredDestinations.length - 1 ? "1px solid #eee" : "none",
                    backgroundColor: dest === "Other (It may take 3-4 minutes to generate the Graph" ? "#f8f8f8" : "white"
                  }}
                  onClick={() => handleDestinationSelect(dest)}
                >
                  {dest}
                </div>
              ))}
            </div>
          )}
          
          {showCustomField && (
            <div style={{ marginTop: "10px" }}>
              <label htmlFor="customDestination" className="Form-label">Custom Destination</label>
              <input
                type="text"
                id="customDestination"
                className="Form-input"
                placeholder="Enter your custom destination"
                value={userData.customDestination}
                onChange={(e) => handleInputChange("customDestination", e.target.value)}
              />
            </div>
          )}
        </div>
        <div>
          <label htmlFor="departureDate" className="Form-label">Departure Date</label>
          <DatePicker
            id="departureDate"
            selected={userData.departureDate}
            onChange={(date) => handleInputChange("departureDate", date)}
            placeholderText="Select departure date"
            className="Form-input"
            minDate={today}
          />
        </div>

        <div>
          <label htmlFor="returnDate" className="Form-label">Return Date</label>
          <DatePicker
            id="returnDate"
            selected={userData.returnDate}
            onChange={(date) => handleInputChange("returnDate", date)}
            placeholderText="Select return date"
            className="Form-input"
            minDate={userData.departureDate || today}
            disabled={!userData.departureDate}
          />
        </div>
        <div>
          <label htmlFor="budget" className="Form-label">Budget</label>
          <input
            type="text"
            id="budget"
            placeholder="Enter budget"
            className="Form-input"
            value={userData.budget}
            onChange={(e) => handleInputChange("budget", e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="description" className="Form-label-describe">Your Interests</label>
          <textarea
            id="description"
            placeholder="Describe your interests"
            className="Form-input"
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box', height: '100px' }}
            value={userData.description}
            onChange={(e) => handleInputChange("description", e.target.value)}
          />
        </div>
      </div>
      <div className="form-hero">
        <div className="hero-content">
          <h3 className="hero-label">Popular Destinations</h3>
          <div className="destination-cards">
            <div className="destination-card">
              <div className="card-image" style={{backgroundImage: "url('https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=400')"}}></div>
              <div className="card-content">
                <div className="card-header">
                  <h4>Seoul, Korea</h4>
                  <span className="rating">★ 4.8</span>
                </div>
                <p className="card-description">Modern city with rich culture and amazing food scenes</p>
              </div>
            </div>
            <div className="destination-card">
              <div className="card-image" style={{backgroundImage: "url('https://images.unsplash.com/photo-1564507592333-c60657eea523?w=400')"}}></div>
              <div className="card-content">
                <div className="card-header">
                  <h4>Taj Mahal, India</h4>
                  <span className="rating">★ 4.9</span>
                </div>
                <p className="card-description">Iconic monument of love and architectural masterpiece</p>
              </div>
            </div>
            <div className="destination-card">
              <div className="card-image" style={{backgroundImage: "url('https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=400')"}}></div>
              <div className="card-content">
                <div className="card-header">
                  <h4>Santorini, Greece</h4>
                  <span className="rating">★ 4.9</span>
                </div>
                <p className="card-description">Beautiful island with stunning sunsets and architecture</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TextBox;