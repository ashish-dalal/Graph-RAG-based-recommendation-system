import React, { useState, useEffect } from "react";
import "./FlexCards.css";

const FlexCards = ({ parentWidth, parentHeight }) => {
  const [selectedCard, setSelectedCard] = useState(1);
  parentHeight = parentHeight * 0.5;
  const cards = 
    [
      {
          "id": 1,
          "icon": "1",
          "title": "Great Wall of China",
          "description": "An ancient series of walls and fortifications, the Great Wall stretches across northern China.",
          "backgroundImage": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRc3QJGKLAIqUpr3AIM2L9wiPOf-StXRKBgqw&s"
      },
      {
          "id": 2,
          "icon": "2",
          "title": "Christ the Redeemer",
          "description": "A colossal statue of Jesus Christ in Rio de Janeiro, Brazil, symbolizing peace and welcoming.",
          "backgroundImage": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTowzxEbT9PVCIPEasewys8l-cDCKyMTPOk5Q&s"
      },
      {
          "id": 3,
          "icon": "3",
          "title": "Machu Picchu",
          "description": "An ancient Incan city set high in the Andes Mountains in Peru, known for its archaeological significance.",
          "backgroundImage": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQwFexZrjZPGcMJBZlz-B0paa3MpRojdZRglA&s"
      },
      {
          "id": 4,
          "icon": "4",
          "title": "Colosseum",
          "description": "An iconic symbol of Imperial Rome, this ancient amphitheater is renowned for its architectural grandeur.",
          "backgroundImage": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR7RdM_gGUlQZaE9Ivq1vta0lGUT6PRn0C4uQ&s"
      }
  ]
  

  return (
    <div className="suggest-section">
      <div className="wrapper" style={{ width:parentWidth, height: parentHeight }}>
      <div className="container">
        {cards.map((card) => (
          <div
            key={card.id}
            className={`card ${selectedCard === card.id ? "active" : ""}`}
            style={{
              backgroundImage: `url(${card.backgroundImage})`,
              width: selectedCard === card.id ? `${parentWidth * 0.6}px` : `${parentWidth * 0.1}px`,
            }}
            onClick={() => setSelectedCard(card.id)}
          >
            <div className="row">
              {/* <div className="icon">{card.icon}</div> */}
              <div className="description">
                <h4 style={{color: "black"}}>{card.title}</h4>
                <p>{card.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
    {/* <button className="suggest-button">Suggestions</button> */}
    </div>
  );
};

export default FlexCards;
