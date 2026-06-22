import React from "react";
import { createRoot } from "react-dom/client";
import { IdCardApp } from "../src/routes/index";

const root = createRoot(document.getElementById("root")!);
root.render(<IdCardApp />);
