import React from "react";
import "./Header.css";
const Header = () => {
  return (
    <header className="custom-header navbar navbar-expand-lg navbar-light">
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
          <div className="dropdown">
            <button
              className="btn btn-secondary dropdown-toggle"
              type="button"
              id="languageDropdown"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              EN
            </button>
            <ul className="dropdown-menu" aria-labelledby="languageDropdown">
              <li>
                <button className="dropdown-item" type="button">
                  EN
                </button>
              </li>
              <li>
                <button className="dropdown-item" type="button">
                  ES
                </button>
              </li>
              <li>
                <button className="dropdown-item" type="button">
                  FR
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
