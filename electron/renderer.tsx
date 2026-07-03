import React from "react";
import { createRoot } from "react-dom/client";
import { IdCardApp } from "../src/routes/index";
import "../src/styles.css";
import "./desktop.css";

document.documentElement.classList.add("desktop-app");
document.body.classList.add("desktop-app");

const root = createRoot(document.getElementById("root")!);
root.render(<IdCardApp />);
