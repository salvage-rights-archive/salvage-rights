import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import PreviewRedirect, { currentPath } from "./PreviewRedirect";

afterEach(cleanup);

const Where = () => {
  const { pathname, search, hash } = useLocation();
  return <p>{`${pathname}${search}${hash}`}</p>;
};

describe("the old gothic-preview links", () => {
  it("go to the same page under gothic, keeping the query", async () => {
    render(
      <MemoryRouter initialEntries={["/battletech/gothic-preview/editor?id=abc-1#top"]}>
        <Routes>
          <Route path="/battletech/gothic-preview/*" element={<PreviewRedirect />} />
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText("/battletech/gothic/editor?id=abc-1#top")).toBeTruthy();
    expect(currentPath("/battletech/gothic/home")).toBeUndefined();
  });
});
