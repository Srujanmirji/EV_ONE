// @vitest-environment jsdom
import React from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AuthSpike } from "./auth-spike";

const sdk = vi.hoisted(() => ({
  sessionId: "session_first",
  getToken: vi.fn(),
  signOut: vi.fn(),
}));
vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({
    isLoaded: true,
    isSignedIn: true,
    sessionId: sdk.sessionId,
    getToken: sdk.getToken,
  }),
  useClerk: () => ({ signOut: sdk.signOut }),
  SignIn: () => null,
  SignUp: () => null,
}));
beforeEach(() => {
  sdk.sessionId = "session_first";
  sdk.getToken.mockReset().mockResolvedValue("synthetic-local-token");
  sdk.signOut.mockReset();
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response(null, { status: 200 })),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("clears an old verification when the Clerk session changes", async () => {
  const view = render(<AuthSpike flow="sign-in" />);
  fireEvent.click(screen.getByRole("button", { name: "Check API token" }));
  await screen.findByText(
    "Development token signature and required claims verified.",
  );
  sdk.sessionId = "session_second";
  view.rerender(<AuthSpike flow="sign-in" />);
  expect(screen.queryByRole("status")).toBeNull();
  expect(
    screen
      .getByRole("button", { name: "Check API token" })
      .hasAttribute("disabled"),
  ).toBe(false);
});

it("does not publish an in-flight result into a replacement session", async () => {
  let complete!: (value: Response) => void;
  vi.mocked(fetch).mockReturnValue(
    new Promise<Response>((resolve) => {
      complete = resolve;
    }),
  );
  const view = render(<AuthSpike flow="sign-in" />);
  fireEvent.click(screen.getByRole("button", { name: "Check API token" }));
  await waitFor(() => expect(fetch).toHaveBeenCalledOnce());
  sdk.sessionId = "session_second";
  view.rerender(<AuthSpike flow="sign-in" />);
  await act(async () => {
    complete(new Response(null, { status: 200 }));
  });
  expect(screen.queryByRole("status")).toBeNull();
});

it("announces sign-out as sign-out and recovers from failure", async () => {
  let fail!: (error: Error) => void;
  sdk.signOut.mockReturnValue(
    new Promise<void>((_resolve, reject) => {
      fail = reject;
    }),
  );
  render(<AuthSpike flow="sign-in" />);
  fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
  expect(
    screen
      .getByRole("button", { name: "Signing out…" })
      .getAttribute("aria-busy"),
  ).toBe("true");
  expect(
    screen
      .getByRole("button", { name: "Check API token" })
      .hasAttribute("disabled"),
  ).toBe(true);
  await act(async () => {
    fail(new Error("synthetic failure"));
  });
  await screen.findByRole("alert");
  expect(
    screen.getByRole("button", { name: "Sign out" }).hasAttribute("disabled"),
  ).toBe(false);
});

it("keeps tokens out of rendered output and supports retry after rejection", async () => {
  vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 401 }));
  render(<AuthSpike flow="sign-in" />);
  fireEvent.click(screen.getByRole("button", { name: "Check API token" }));
  await screen.findByRole("alert");
  expect(document.body.textContent).not.toContain("synthetic-local-token");
  fireEvent.click(screen.getByRole("button", { name: "Check API token" }));
  await screen.findByText(
    "Development token signature and required claims verified.",
  );
  expect(sdk.getToken).toHaveBeenCalledWith({ template: "evone-api" });
});
