// @vitest-environment jsdom
import React from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, it, expect, vi } from "vitest";
import { CatalogueWorkspace } from "./workspace";
import type { EditorRequest } from "./workspace";
import type { CatalogueDraftView } from "@evone/contracts";
import { emptyDocument } from "@/lib/catalogue-editor/form";
const first = "27b7105e-4772-4827-b8a8-04b481e98d10",
  second = "27b7105e-4772-4827-b8a8-04b481e98d11";
function draft(id = first): CatalogueDraftView {
  const document = emptyDocument();
  document.brand = { name: "DEMO Brand", slug: "demo-brand" };
  document.model.name = id === first ? "DEMO Alpha" : "DEMO Beta";
  document.model.slug = "demo-model";
  document.variants[0]!.name = "DEMO Variant";
  document.variants[0]!.slug = "demo-variant";
  document.variants[0]!.specs.batteryKwh = 2;
  document.variants[0]!.sources = [
    {
      fieldName: "BATTERY_KWH",
      valueText: "Fictional 2 kWh battery",
      sourceUrl: "https://example.com/synthetic-source",
      sourceKind: "OTHER",
      effectiveAt: null,
    },
  ];
  return {
    id,
    document,
    version: 1,
    updatedAt: "2026-11-04T06:00:00.000Z",
    lastActorId: first,
    status: "DRAFT",
    reviewReason: null,
    modelId: null,
    isOwner: true,
    canReview: false,
  };
}
const envelope = (data: unknown) => ({ data, meta: { requestId: first } });
const list = (items: CatalogueDraftView[], role = "EDITOR") =>
  envelope({
    role,
    items: items.map((item) => ({
      id: item.id,
      name: item.document.model.name,
      version: item.version,
      status: item.status,
    })),
    nextCursor: null,
  });
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it("starts empty and resets discarded new-form values", async () => {
  const request = vi.fn<EditorRequest>().mockResolvedValue(list([]));
  render(<CatalogueWorkspace request={request} />);
  await screen.findByText("No drafts yet");
  fireEvent.click(screen.getByRole("button", { name: "New draft" }));
  fireEvent.change(screen.getByLabelText(/Brand name/), {
    target: { value: "Unsaved" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Add variant" }));
  vi.spyOn(window, "confirm").mockReturnValue(true);
  fireEvent.click(screen.getByRole("button", { name: "Remove last variant" }));
  expect(screen.queryByText("Variant 2")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Add variant" }));
  fireEvent.click(screen.getByRole("button", { name: "New draft" }));
  expect((screen.getByLabelText(/Brand name/) as HTMLInputElement).value).toBe(
    "",
  );
  expect(screen.queryByText("Variant 2")).toBeNull();
});
it("preserves values on failed save and resets when reopening the same saved revision", async () => {
  const saved = draft();
  const request = vi
    .fn<EditorRequest>()
    .mockImplementation((path) =>
      Promise.resolve(path === "/drafts" ? list([saved]) : envelope(saved)),
    );
  render(<CatalogueWorkspace request={request} />);
  fireEvent.click(await screen.findByRole("button", { name: /DEMO Alpha/ }));
  await screen.findByDisplayValue("DEMO Alpha");
  fireEvent.change(screen.getByLabelText(/Model name/), {
    target: { value: "Unsaved edit" },
  });
  request.mockRejectedValueOnce(
    new Error("Revision conflict. Reload saved revision."),
  );
  fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
  await screen.findByText("Revision conflict. Reload saved revision.");
  expect((screen.getByLabelText(/Model name/) as HTMLInputElement).value).toBe(
    "Unsaved edit",
  );
  expect(
    screen
      .getByRole("button", { name: "Submit for review" })
      .hasAttribute("disabled"),
  ).toBe(true);
  vi.spyOn(window, "confirm").mockReturnValue(true);
  fireEvent.click(
    screen.getByRole("button", { name: "Reload saved revision" }),
  );
  await waitFor(() =>
    expect(
      (screen.getByLabelText(/Model name/) as HTMLInputElement).value,
    ).toBe("DEMO Alpha"),
  );
});
it("resets review attestation and reason when switching drafts and exposes focusable sources", async () => {
  const a = {
    ...draft(),
    isOwner: false,
    status: "IN_REVIEW" as const,
    canReview: true,
  };
  const b = {
    ...draft(second),
    isOwner: false,
    status: "IN_REVIEW" as const,
    canReview: true,
  };
  const request = vi
    .fn<EditorRequest>()
    .mockImplementation((path) =>
      Promise.resolve(
        path === "/drafts"
          ? list([a, b], "ADMIN")
          : envelope(path.endsWith(second) ? b : a),
      ),
    );
  render(<CatalogueWorkspace request={request} />);
  fireEvent.click(await screen.findByRole("button", { name: /DEMO Alpha/ }));
  const checkbox = await screen.findByLabelText(/I reviewed the cited sources/);
  fireEvent.click(checkbox);
  fireEvent.change(screen.getByLabelText("Reason for requesting changes"), {
    target: { value: "For Alpha only" },
  });
  const link = screen.getByRole("link", { name: /Open Battery source/ });
  link.focus();
  expect(document.activeElement).toBe(link);
  expect(link.getAttribute("rel")).toContain("noopener");
  fireEvent.click(screen.getByRole("button", { name: /DEMO Beta/ }));
  await screen.findByDisplayValue("DEMO Beta");
  expect(
    (screen.getByLabelText(/I reviewed the cited sources/) as HTMLInputElement)
      .checked,
  ).toBe(false);
  expect(
    (screen.getByLabelText("Reason for requesting changes") as HTMLInputElement)
      .value,
  ).toBe("");
});
it("sends the clicked review decision and exact revision", async () => {
  const a = {
    ...draft(),
    isOwner: false,
    status: "IN_REVIEW" as const,
    canReview: true,
  };
  const request = vi.fn<EditorRequest>().mockImplementation((path, method) =>
    Promise.resolve(
      path === "/drafts"
        ? list([a], "ADMIN")
        : envelope(
            method === "POST"
              ? {
                  ...a,
                  status: "PUBLISHED",
                  version: 2,
                  modelId: second,
                  canReview: false,
                }
              : a,
          ),
    ),
  );
  render(<CatalogueWorkspace request={request} />);
  fireEvent.click(await screen.findByRole("button", { name: /DEMO Alpha/ }));
  fireEvent.click(await screen.findByLabelText(/I reviewed the cited sources/));
  const reason = screen.getByLabelText("Reason for requesting changes");
  fireEvent.change(reason, {
    target: { value: "Check these citations first" },
  });
  expect(fireEvent.keyDown(reason, { key: "Enter", code: "Enter" })).toBe(
    false,
  );
  expect(request.mock.calls.some((call) => call[0].endsWith("/review"))).toBe(
    false,
  );
  fireEvent.click(screen.getByRole("button", { name: "Approve and publish" }));
  await screen.findByText("Review recorded.");
  expect(request).toHaveBeenCalledWith(`/drafts/${first}/review`, "POST", {
    version: 1,
    decision: "APPROVE",
    reviewedSources: true,
  });
});
it("shows actionable initial failure and retries", async () => {
  const request = vi
    .fn<EditorRequest>()
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValue(list([]));
  render(<CatalogueWorkspace request={request} />);
  await screen.findByRole("alert");
  fireEvent.click(screen.getByRole("button", { name: "Retry drafts" }));
  await screen.findByText("No drafts yet");
});
