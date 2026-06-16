import React from "react";
import { Outlet } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";

const Layout = () => {
  return (
    <div className="app-layout">
      <Header />
      <main style={{ paddingTop: '90px' }}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default Layout;
