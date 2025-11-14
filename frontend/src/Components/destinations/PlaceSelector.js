import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Card from "../card/Card";
import "../../styles.css";
import "./PlaceSelector.css";
import Modal from "../modal/Modal";

let MAP_KEY = process.env.REACT_APP_MAPS_API_KEY;

const PlaceSelector = () => {
    const nav = useNavigate();
    const loc = useLocation();
    const { userData } = loc.state || {};
    const [chosenIds, setChosenIds] = useState([]);
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [modalData, setModalData] = useState(null);

    console.log("places selected", chosenIds)

    useEffect(() => {
        const loadLocations = async (data) => {
            try {
                const resp = await fetch('http://localhost:5000/api/top-places', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data),
                });

                if (!resp.ok) {
                    throw new Error(`HTTP error! Status: ${resp.status}`);
                }

                const result = await resp.json();
                const items = result.places || [];
                setLocations(items);
                console.log("Places fetched:", items);

                const preselected = items
                    .filter(item => item.selected == 1)
                    .map(item => item.place_id);
                setChosenIds(preselected);

                console.log("Places fetched:", items);
                setLoading(false);
            }
            catch (err) {
                console.error("Error fetching places:", err);
                setLoading(false);
            }
        };

        loadLocations(userData);
    }, [userData]);

    const toggleSelection = (id) => {
        setLocations(prevItems =>
            prevItems.map(item =>
                item.place_id == id
                    ? { ...item, selected: item.selected == 1 ? 0 : 1 }
                    : item
            )
        );

        setChosenIds(prev =>
            prev.includes(id)
                ? prev.filter(itemId => itemId != id)
                : [...prev, id]
        );
    };

    const proceedToPlanner = () => {
        if (chosenIds.length === 0) {
            alert("Choose at least 1 place to visit!");
            return;
        }

        nav("/event-planner", {
            state: {
                selectedPlacesIds: chosenIds,
                places: locations,
                userData: userData
            }
        });
        console.log("Selected places:", chosenIds);
    };

    const displayDetails = (item) => {
        setModalData(item);
        setShowModal(true);
    };

    const hideModal = () => {
        setShowModal(false);
        setModalData(null);
    };

    return (
        <div className="stylecontainer" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <header className="custom-header-places navbar navbar-expand-lg navbar-light">
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

            <main className="places-list">
                {loading ? (
                    <img src="images/loading-animation.svg" alt="Loading..." style={{ height: 500, opacity: 0.8 }} />
                ) : (
                    <div className="card-container">
                        {locations.length === 0 ? (
                            <p>No places found.</p>
                        ) : (
                            locations.map((item) => {
                                let imgRef = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRq7tDgp_TYwdGlzX5KjF8KTQzJh8zQp6ow2g&s";
                                try {
                                    if (item.photos) {
                                        imgRef = item.photos[0]['photo_reference'];
                                    }
                                } catch (err) {
                                    console.error("Error parsing photo data:", err);
                                }
                                return (
                                    <Card
                                        key={item.place_id}
                                        title={item.name}
                                        description={item.formatted_address}
                                        rating={item.rating}
                                        onDetails={() => displayDetails(item)}
                                        image={item.photos ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${imgRef}&key=${MAP_KEY}` : "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRq7tDgp_TYwdGlzX5KjF8KTQzJh8zQp6ow2g&s"}
                                        isSelected={item.selected == 1}
                                        onSelect={() => toggleSelection(item.place_id)}
                                    />
                                )
                            })
                        )}
                    </div>
                )}

                <Modal isOpen={showModal} onClose={hideModal}>
                    {modalData && (
                        <div>
                            <h2><b>{modalData.name}</b></h2>
                            <p><b>Address:</b> {modalData.formatted_address}</p>
                            <div className="rating">
                                <p>Rated {modalData.rating}/5</p>
                                <img src="https://cdn-icons-png.flaticon.com/512/276/276020.png" style={{ height: "20px", width: "20px", marginRight: "10px" }} />
                                <p> by {modalData.user_ratings_total} people.</p>
                            </div>
                            <p>Known For: {modalData.types.map(element => element).join(", ")}</p>

                            <iframe
                                width="450"
                                height="300"
                                frameBorder="0"
                                referrerPolicy="no-referrer-when-downgrade"
                                src={`https://www.google.com/maps/embed/v1/place?key=${process.env.REACT_APP_MAPS_API_KEY}&q=${encodeURIComponent(modalData.formatted_address)}`}
                                allowFullScreen>
                            </iframe>
                        </div>
                    )}
                </Modal>

                <div className="event-planner-section">
                    <button
                        className={`event-planner-btn ${chosenIds.length < 1 ? "disabled" : ""}`}
                        onClick={proceedToPlanner}
                        disabled={chosenIds.length < 1}
                    >
                        Itinerary Planner
                    </button>
                </div>
            </main>
        </div>
    );
};

export default PlaceSelector;
