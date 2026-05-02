import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Login from "./components/Login";
import Register from "./components/Register";
import AuthRedirect from "./components/AuthRedirect";
import Navbar from "./components/Navbar";
import Account from "./components/Account";
import AdminHome from "./components/AdminHome";
import Home from "./components/Home";


function App() {
    return (
        <Router>
            <Navbar />
            <Routes>
                <Route path="/" element={<AuthRedirect />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/account" element={<Account />} />
                <Route path="/admin" element={<AdminHome />} />
                <Route path="/home" element={<Home />} />
            </Routes>
        </Router>
    );
}

export default App;
