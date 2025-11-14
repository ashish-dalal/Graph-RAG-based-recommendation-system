import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import EventCards from "../eventCards/EventCards";
import './ItineraryPlanner.css';

const ItineraryPlanner = () => {
  const loc = useLocation();
  const { selectedPlacesIds, places, userData } = loc.state || {};
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);

  const chosenLocs = (places || []).filter((item) =>
    selectedPlacesIds?.includes(item.place_id)
  );

  useEffect(() => {
    if (!chosenLocs || !userData) {
      setLoading(false);
      return;
    }

    let context = chosenLocs
      .map((item) => {
        let info = `NAME: '${item.name}' is located in ${item.address}, and has a rating of ${item.rating}. It was chosen by the user`;
        if (item.types && item.types.length > 0) {
          const features = item.types.join(", ");
          info += ` because of the following reasons: ${features}`;
        }
        return info;
      })
      .join("\n");

    const instructions = `You are an event planner and your task is to plan a series of events for a group of tourists visiting the region of ${userData.destination} between ${userData.departureDate} to ${userData.returnDate}. They have a budget of ${userData.budget}, so plan accordingly.`;

    const loadSchedule = async () => {
      try {
        const resp = await fetch("http://localhost:5000/api/event-planner", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            selectedPlaces: context,
            userInput: instructions,
          }),
        });

        if (!resp.ok) {
          throw new Error(`HTTP error! Status: ${resp.status}`);
        }

        const result = await resp.json();
        setSchedule(result || []);
      } catch (err) {
        console.error("Error fetching event plan:", err);
      } finally {
        setLoading(false);
      }
    };

    loadSchedule();
  }, []);

  return (
    <div className="event-planner-container">
      <header className="custom-header-event navbar navbar-expand-lg navbar-light sticky-top">
        <div className="container-fluid">
          <div className="navbar-brand logo">
            <img
              src="/images/logo_main.png"
              alt="Logo"
              className="logo-img"
            />
          </div>
          <div className="title">
            <p>Your Personal Travel Guide</p>
          </div>

          <div className="d-flex align-items-center">
            <button className="btn btn-outline-primary me-2">Register</button>
            <button className="btn btn-primary me-2">Login</button>
            <div className="form-check form-switch me-3">
              <input
                className="form-check-input"
                type="checkbox"
                id="darkModeSwitch"
              />
            </div>
          </div>
        </div>
      </header>

      <div className="event-planner-content">
        {loading ? (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            width: '100%',
          }}>
            <img src="images/loading-animation.svg" alt="Loading..." style={{ height: 500, opacity: 0.8 }} />
          </div>
        ) : (
          <div className="itinerary-container">
            <h2 className="text-center mb-4" style={{ color: 'whitesmoke', fontWeight: "bold" }}>Your Travel Itinerary</h2>
            <div className="itinerary-timeline">
              {schedule.map((item, idx) => (
                <div key={idx} className="itinerary-item">
                  <div className="event-card-wrapper">
                    <div className="event-card">
                      <EventCards
                        locations={[item]}
                        indexPrint={idx}
                        selectedPlaces={chosenLocs}
                      />
                    </div>
                  </div>

                  {idx < schedule.length - 1 && (
                    <div className="arrow-container">
                      <div className="animated-arrow">
                        <svg width="40" height="100" xmlns="http://www.w3.org/2000/svg">
                          <defs>
                            <linearGradient id={`arrowGradient-${idx}`} x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="#4e54c8" stopOpacity="0.8">
                                <animate attributeName="stopOpacity" values="0.8;1;0.8" dur="2s" repeatCount="indefinite" />
                              </stop>
                              <stop offset="100%" stopColor="#8f94fb" stopOpacity="0.9">
                                <animate attributeName="stopOpacity" values="0.9;1;0.9" dur="2s" repeatCount="indefinite" />
                              </stop>
                            </linearGradient>
                          </defs>
                          <path
                            d="M20,5 L20,75 M8,65 L20,85 L32,65"
                            stroke={`url(#arrowGradient-${idx})`}
                            strokeWidth="5"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ItineraryPlanner;
