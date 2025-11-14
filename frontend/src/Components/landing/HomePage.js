import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import "../../styles.css";
import "./HomePage.css";
import Header from "../header/Header";
import TextBox from "../textBox/TextBox";

const HomePage = () => {
    const nav = useNavigate();

    const [tripData, setTripData] = useState({
        source: "",
        destination: "",
        departureDate: null,
        returnDate: null,
        budget: "",
        description: "",
    });

    const handleDataUpdate = (updatedData) => {
        setTripData(updatedData);
    };

    const navigateToSelector = () => {
        nav('/place-selector', {
            state: {
                userData: tripData,
            },
        });
    };

    return (
        <>
            <div className="banner-text">
                <Header />
                <TextBox updateUserData={handleDataUpdate} />
                <button onClick={navigateToSelector} className="btn btn-primary">Recommend Places</button>
            </div>
        </>
    );
};

export default HomePage;
