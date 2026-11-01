// @vitest-environment jsdom
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../src/App";
beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      json: async () => ({ configured: false, model: "test" }),
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
describe("working editor", () => {
  it("opens a sample, edits analysis, undoes/redoes, persists, and reopens it", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App />);
    await user.click(screen.getByText("Explore a sample project"));
    const summary = screen.getByLabelText("Summary");
    fireEvent.change(summary, { target: { value: "A revised summary." } });
    expect((summary as HTMLTextAreaElement).value).toBe("A revised summary.");
    await user.click(screen.getByLabelText("Undo"));
    expect(
      (screen.getByLabelText("Summary") as HTMLTextAreaElement).value,
    ).toContain("rescue boat");
    await user.click(screen.getByLabelText("Redo"));
    expect(
      (screen.getByLabelText("Summary") as HTMLTextAreaElement).value,
    ).toBe("A revised summary.");
    await waitFor(() =>
      expect(localStorage.getItem("reverse-outliner.projects.v1")).toContain(
        "A revised summary.",
      ),
    );
    unmount();
    render(<App />);
    await user.click(screen.getByText("The Last Light"));
    expect(
      (screen.getByLabelText("Summary") as HTMLTextAreaElement).value,
    ).toBe("A revised summary.");
  });
  it("adds, reorders, deletes and restores scenes", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByText("Start a blank project"));
    await user.click(screen.getAllByRole("button", { name: "Add scene" })[0]);
    fireEvent.change(screen.getByLabelText("Scene heading"), {
      target: { value: "INT. FIRST - DAY" },
    });
    await user.click(screen.getByLabelText("Add scene"));
    fireEvent.change(screen.getByLabelText("Scene heading"), {
      target: { value: "EXT. SECOND - NIGHT" },
    });
    await user.click(screen.getByLabelText("Move scene up"));
    expect(
      (screen.getByLabelText("Scene heading") as HTMLInputElement).value,
    ).toBe("EXT. SECOND - NIGHT");
    await user.click(screen.getByLabelText("Delete scene"));
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Delete scene",
      }),
    );
    expect(
      (screen.getByLabelText("Scene heading") as HTMLInputElement).value,
    ).toBe("INT. FIRST - DAY");
    await user.click(screen.getByLabelText("Undo"));
    expect(screen.getAllByText("EXT. SECOND - NIGHT").length).toBeGreaterThan(
      0,
    );
  });
  it("filters character storylines including an offscreen character and edits associations", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByText("Explore a sample project"));
    await user.click(screen.getByText("Add character arc"));
    fireEvent.change(screen.getByLabelText("Arc 3 character"), {
      target: { value: "CAPTAIN" },
    });
    await user.selectOptions(
      screen.getByLabelText("Arc 3 involvement"),
      "involved",
    );
    fireEvent.change(screen.getByLabelText("CAPTAIN · after"), {
      target: { value: "Hopeful" },
    });
    await user.click(screen.getByRole("button", { name: "Characters" }));
    await user.selectOptions(
      screen.getByLabelText("Character storyline"),
      "CAPTAIN",
    );
    expect(
      screen.getByText(
        "1 scenes, in story order. Includes meaningful off-screen involvement.",
      ),
    ).toBeTruthy();
    expect(screen.getByText("Off-screen")).toBeTruthy();
    const names = screen.getByLabelText(
      "On-screen characters (comma separated)",
    );
    await user.clear(names);
    await user.type(names, "MARA, ELI, CREW");
    await user.tab();
    expect((names as HTMLInputElement).value).toBe("MARA, ELI, CREW");
  });
  it("keeps AI disabled with setup instructions when no key is configured", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByText("Explore a sample project"));
    await user.click(screen.getByRole("button", { name: "Analyze script" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("OPENAI_API_KEY")).toBeTruthy();
    expect(
      (
        within(dialog).getByRole("button", {
          name: "Start analysis",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });
  it("uploads TXT through the actual file input and edits the resulting scenes", async () => {
    const user = userEvent.setup();
    render(<App />);
    const text =
      "INT. OFFICE - DAY\nA desk.\n\nJANE\nHello.\n\nEXT. PARK - NIGHT\nWind.";
    const file = new File([text], "Uploaded.txt", { type: "text/plain" });
    Object.defineProperty(file, "text", { value: async () => text });
    await user.upload(screen.getByLabelText("Upload screenplay"), file);
    await screen.findByDisplayValue("Uploaded");
    expect(
      screen.getByText("Your script is parsed. Summaries need AI setup."),
    ).toBeTruthy();
    expect(
      (screen.getByLabelText("Scene heading") as HTMLInputElement).value,
    ).toBe("INT. OFFICE - DAY");
    expect(
      (
        screen.getByLabelText(
          "On-screen characters (comma separated)",
        ) as HTMLInputElement
      ).value,
    ).toBe("JANE");
  });
  it("applies server analysis and can undo it without changing scene text", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (url: string) =>
        url === "/api/health"
          ? { json: async () => ({ configured: true, model: "test" }) }
          : {
              ok: true,
              json: async () => ({
                summary: "Fresh server analysis",
                purpose: "A test",
                conflict: "Doubt",
                turningPoint: "A choice",
                emotions: [],
              }),
            },
      ),
    );
    render(<App />);
    await user.click(screen.getByText("Explore a sample project"));
    await user.click(screen.getByText("Reanalyze scene"));
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Start analysis",
      }),
    );
    await waitFor(() =>
      expect(
        (screen.getByLabelText("Summary") as HTMLTextAreaElement).value,
      ).toBe("Fresh server analysis"),
    );
    await user.click(screen.getByLabelText("Undo"));
    expect(
      (screen.getByLabelText("Summary") as HTMLTextAreaElement).value,
    ).toContain("rescue boat");
    expect(
      (screen.getByLabelText("Scene text") as HTMLTextAreaElement).value,
    ).toContain("MARA packs a weathered logbook");
  });
});
