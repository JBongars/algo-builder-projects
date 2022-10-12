import { render, screen } from "@testing-library/react";
import React from "react";

import App from "./App";

test("renders learn react link", () => {
  render(<App />);
  const linkElement = screen.getByText(/HTLC Escrow Account Template/i);
  expect(linkElement).toBeInTheDocument();
});
