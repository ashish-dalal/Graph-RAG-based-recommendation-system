// src/components/Card.js
import React from "react";
import "./Card.css";

const Card = ({ title, description, image, rating, entryFee, onSelect, isSelected, onDetails }) => {
  return (
    <div className="card">
      <img src={image} alt={title} />
      <div className="card-content">
        <div className="desc">
        <h3>{title}</h3>
        <p>{description}</p>
        </div>
        <div className="rating">
        <p>Rated at {rating}</p>
        <img src="https://cdn-icons-png.flaticon.com/512/276/276020.png" style={{height:"20px", width: "20px"}}/>
        
        </div>
        <button onClick={onDetails} className="details-button">
                View Details
            </button>
        <label className="select-place">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onSelect}
          />
          Add to Visit
        </label>
      </div>
    </div>
  );
};

export default Card;

