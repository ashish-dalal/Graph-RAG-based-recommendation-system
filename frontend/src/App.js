import React from "react";
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import ItineraryPlanner from "./Components/scheduler/ItineraryPlanner";
import PlaceSelector from "./Components/destinations/PlaceSelector"
import HomePage from "./Components/landing/HomePage"
const App = () => {
return (
<Routes>
  <Route path="/" element={<HomePage />} />
  <Route path="/place-selector" element={<PlaceSelector />} />
  <Route path="/event-planner" element={<ItineraryPlanner />} /> 
</Routes>
);
};

export default App;