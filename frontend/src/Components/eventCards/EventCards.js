import React from 'react';
import './EventCards.css';

const EventCards = ({ locations, indexPrint, selectedPlaces }) => {
  // API key should be stored in an environment variable in production
  const API_KEY = process.env.REACT_APP_MAPS_API_KEY;

  // Function to find the matching place from selectedPlaces
  const findMatchingPlace = (locationName) => {
    if (!selectedPlaces || selectedPlaces.length === 0) return null;
    return selectedPlaces.find(place => 
      place.name.toLowerCase() === locationName.toLowerCase() ||
      locationName.toLowerCase().includes(place.name.toLowerCase()) ||
      place.name.toLowerCase().includes(locationName.toLowerCase())
    );
  };

  // Function to get image URL based on location data
  const getImageUrl = (location) => {
    const matchingPlace = findMatchingPlace(location.name);
    
    if (matchingPlace && matchingPlace.photos && matchingPlace.photos.length > 0) {
      // Extract photo reference from the matching place
      const photoReference = matchingPlace.photos[0].photo_reference;
      return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photoReference}&key=${API_KEY}`;
    } else if (location.image_url) {
      // Use image URL if provided in the location data
      return location.image_url;
    } else {
      // Fall back to placeholder image
      const formattedName = encodeURIComponent(location.name.toLowerCase().replace(/\s+/g, '-'));
      return `/api/placeholder/400/320?text=${formattedName}`;
    }
  };

  return (
    <div className="cards-container">
      {locations.map((location, index) => {
        // Try to get the image URL for this location
        let imageUrl;
        try {
          imageUrl = getImageUrl(location);
        } catch (error) {
          console.error("Error getting image for location:", location.name, error);
          // Fallback to placeholder
          const formattedName = encodeURIComponent(location.name.toLowerCase().replace(/\s+/g, '-'));
          imageUrl = `/api/placeholder/400/320?text=${formattedName}`;
        }
        console.log(indexPrint)
        return (
          <div className="event-card" key={index}>
            <div className="event-card-image">
              <img src={imageUrl} alt={location.name} />
              <div className="event-number">{indexPrint + 1}</div>
            </div>
            
            <div className="event-card-content">
              <h2 className="event-card-title">{location.name}</h2>
              
              <div className="event-card-description">
                <p>{location.details}</p>
              </div>
              
              <div className="event-card-details">
                <div className="detail-item">
                  <div className="detail-icon">⏱️</div>
                  <div className="detail-text">
                    <span className="detail-label">Timing:</span>
                    <span className="detail-value">{location.timing}</span>
                  </div>
                </div>
                
                <div className="detail-item">
                  <div className="detail-icon">⌛</div>
                  <div className="detail-text">
                    <span className="detail-label">Duration:</span>
                    <span className="detail-value">{location.total_duration}</span>
                  </div>
                </div>
                
                <div className="detail-item">
                  <div className="detail-icon">🚗</div>
                  <div className="detail-text">
                    <span className="detail-label">Transport:</span>
                    <span className="detail-value">{location.recommended_transport}</span>
                  </div>
                </div>
                
                {location.famous_activity && (
                  <div className="detail-item">
                    <div className="detail-icon">🎯</div>
                    <div className="detail-text">
                      <span className="detail-label">Activity:</span>
                      <span className="detail-value">{location.famous_activity}</span>
                    </div>
                  </div>
                )}
              </div>
              
              {location.additional_notes && (
                <div className="event-card-notes">
                  <h4>Notes</h4>
                  <p>{location.additional_notes}</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default EventCards;