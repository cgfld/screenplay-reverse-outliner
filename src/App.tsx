import { useEffect, useRef, useState, type ChangeEvent } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowLeft,
  BookOpen,
  Check,
  ChevronRight,
  Download,
  FilePlus2,
  FileText,
  GripVertical,
  Layers3,
  Loader2,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Undo2,
  Redo2,
  Upload,
  Users,
  X,
} from "lucide-react";
import {
  charactersOf,
  makeProject,
  newScene,
  renameCharacter,
  reorderScenes,
  sceneHasCharacter,
  type Project,
  type Scene,
  type Analysis,
} from "./model/project";
import { record, undo, redo, type History } from "./model/history";
import {
  exportProject,
  importProject,
  loadProjects,
  saveProjects,
} from "./storage/projects";
import { parseUpload } from "./parsing/upload";
import { analyzeScene } from "./analysis/client";
import { demoProject } from "./demo";
function Field({
  label,
  value,
  onChange,
  multiline = false,
  placeholder = "Add your notes…",
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  multiline?: boolean;
  placeholder?: string;
}) {
  const limit =
    label === "Scene text"
      ? 150000
      : label === "Writer’s notes"
        ? 20000
        : label === "Summary"
          ? 15000
          : label === "Time of day"
            ? 200
            : label.endsWith("· emotional change")
              ? 5000
              : label.endsWith("· before") || label.endsWith("· after")
                ? 3000
                : multiline
                  ? 10000
                  : 1000;
  return (
    <label className="field">
      <span>{label}</span>
      {multiline ? (
        <textarea
          aria-label={label}
          maxLength={limit}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
        />
      ) : (
        <input
          aria-label={label}
          maxLength={limit}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      )}
    </label>
  );
}
function IconButton({
  label,
  onClick,
  disabled = false,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      className="icon-button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
function CharacterInput({
  names,
  onChange,
  sceneId,
}: {
  names: string[];
  onChange: (names: string[]) => void;
  sceneId: string;
}) {
  const [draft, setDraft] = useState(names.join(", "));
  const [warning, setWarning] = useState("");
  useEffect(() => {
    setDraft(names.join(", "));
    setWarning("");
  }, [names, sceneId]);
  function commit() {
    const next = [
      ...new Set(
        draft
          .split(",")
          .map((n) => n.trim().toUpperCase())
          .filter(Boolean),
      ),
    ];
    if (next.length > 200 || next.some((n) => n.length > 120)) {
      setWarning("Use up to 200 characters, with names under 121 letters.");
      return;
    }
    setWarning("");
    onChange(next);
  }
  return (
    <label className="field">
      <span>On-screen characters (comma separated)</span>
      <input
        aria-label="On-screen characters (comma separated)"
        placeholder="MARA, ELI"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
      />
      {warning && <small role="alert">{warning}</small>}
    </label>
  );
}

export default function App() {
  const [initial] = useState(() => {
    try {
      return { projects: loadProjects(), error: "" };
    } catch (e) {
      return {
        projects: [] as Project[],
        error:
          "Could not read saved projects. Your browser data has been preserved. " +
          (e as Error).message,
      };
    }
  });
  const [library, setLibrary] = useState(initial.projects);
  const [h, setH] = useState<History<Project> | null>(null);
  const project = h?.present;
  const [saveState, setSaveState] = useState("Saved locally");
  const [error, setError] = useState(initial.error);
  const [storageBlocked, setStorageBlocked] = useState(!!initial.error);
  const [selected, setSelected] = useState("");
  const [view, setView] = useState<"outline" | "characters">("outline");
  const [character, setCharacter] = useState("");
  const [search, setSearch] = useState("");
  const [showReference, setShowReference] = useState(true);
  const [referenceTab, setReferenceTab] = useState<"scene" | "full">("scene");
  const [dragId, setDragId] = useState("");
  const [busy, setBusy] = useState("");
  const [progress, setProgress] = useState("");
  const [configured, setConfigured] = useState(false);
  const [model, setModel] = useState("");
  const [pendingDelete, setPendingDelete] = useState(false);
  const [analysisDialog, setAnalysisDialog] = useState<"scene" | "all" | null>(
    null,
  );
  const scriptInput = useRef<HTMLInputElement>(null),
    jsonInput = useRef<HTMLInputElement>(null),
    controller = useRef<AbortController | null>(null);
  const current = useRef(project);
  current.current = project;
  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((d) => {
        setConfigured(d.configured);
        setModel(d.model);
      })
      .catch(() => setConfigured(false));
  }, []);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    if (!project || storageBlocked) return;
    setSaveState("Saving…");
    const id = setTimeout(() => {
      try {
        setLibrary((prev) => {
          const next = [project, ...prev.filter((p) => p.id !== project.id)];
          try {
            saveProjects(next);
            setSaveState("Saved locally");
          } catch {
            setSaveState("Save failed");
            setError(
              "Browser storage is full or unavailable. Export JSON now to keep your work.",
            );
          }
          return next;
        });
      } catch {
        setSaveState("Save failed");
      }
    }, 500);
    return () => clearTimeout(id);
  }, [project, storageBlocked]);
  useEffect(() => {
    const flush = (event: BeforeUnloadEvent) => {
      if (!current.current || storageBlocked) return;
      try {
        saveProjects([
          current.current,
          ...library.filter((p) => p.id !== current.current!.id),
        ]);
      } catch {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", flush);
    return () => window.removeEventListener("beforeunload", flush);
  }, [library, storageBlocked]);
  function update(fn: (p: Project) => Project) {
    setH((prev) =>
      prev
        ? record(prev, {
            ...fn(prev.present),
            updatedAt: new Date().toISOString(),
          })
        : prev,
    );
  }
  function changeScene(id: string, fn: (s: Scene) => Scene) {
    update((p) => ({
      ...p,
      scenes: p.scenes.map((s) => (s.id === id ? fn(s) : s)),
    }));
  }
  function openProject(p: Project) {
    setH({ past: [], present: p, future: [] });
    setSelected(p.scenes[0]?.id || "");
    setView("outline");
    setCharacter("");
    setSearch("");
    setError("");
  }
  function leaveProject() {
    if (project && !storageBlocked) {
      try {
        const next = [project, ...library.filter((p) => p.id !== project.id)];
        saveProjects(next);
        setLibrary(next);
      } catch {
        setError("Could not save. Export JSON before leaving.");
        return;
      }
    }
    setH(null);
  }
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (!busy)
          setH((prev) =>
            prev ? (e.shiftKey ? redo(prev) : undo(prev)) : prev,
          );
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        if (!busy) setH((prev) => (prev ? redo(prev) : prev));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [busy]);
  async function upload(e: ChangeEvent<HTMLInputElement>, json = false) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy("upload");
    setError("");
    try {
      openProject(
        json ? importProject(await file.text()) : await parseUpload(file),
      );
      if (!json && configured) setAnalysisDialog("all");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy("");
    }
  }
  async function runAnalysis(mode: "scene" | "all") {
    if (!project) return;
    setAnalysisDialog(null);
    setBusy("analysis");
    setError("");
    const abort = new AbortController();
    controller.current = abort;
    const snapshot = project;
    const targets =
      mode === "scene"
        ? project.scenes.filter((s) => s.id === selected)
        : project.scenes;
    let completed = 0;
    try {
      for (const target of targets) {
        if (!target.sourceText.trim())
          throw new Error(
            `Scene ${snapshot.scenes.indexOf(target) + 1} has no scene text. Add text before analyzing it.`,
          );
        setProgress(`${completed + 1} of ${targets.length}`);
        const analysis = await analyzeScene(
          current.current || snapshot,
          target,
          abort.signal,
        );
        if (abort.signal.aborted) break;
        changeScene(target.id, (s) => ({ ...s, analysis, analyzed: true }));
        completed++;
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError")
        setError(
          `${completed ? `${completed} scene(s) saved. ` : ""}${(err as Error).message}`,
        );
    } finally {
      setBusy("");
      setProgress("");
      controller.current = null;
    }
  }
  const allCharacters = project ? charactersOf(project) : [];
  const scenes =
    project?.scenes.filter(
      (s) =>
        (!character || sceneHasCharacter(s, character)) &&
        (!search ||
          [s.heading, s.location, s.analysis.summary, ...s.characters]
            .join(" ")
            .toLowerCase()
            .includes(search.toLowerCase())),
    ) || [];
  const scene = project?.scenes.find((s) => s.id === selected);
  const activeNumber = scene && project ? project.scenes.indexOf(scene) + 1 : 0;
  function addScene() {
    if (project && project.scenes.length >= 2000) {
      setError("This project has reached the 2,000 scene limit.");
      return;
    }
    const s = newScene();
    if (character) s.characters = [character];
    update((p) => ({ ...p, scenes: [...p.scenes, s] }));
    setSelected(s.id);
    setSearch("");
  }
  function moveScene(id: string, offset: number) {
    if (!project) return;
    const at = project.scenes.findIndex((s) => s.id === id);
    const to = project.scenes[at + offset];
    if (to)
      update((p) => ({ ...p, scenes: reorderScenes(p.scenes, id, to.id) }));
  }
  function setAnalysis(key: keyof Omit<Analysis, "emotions">, value: string) {
    if (scene)
      changeScene(scene.id, (s) => ({
        ...s,
        analysis: { ...s.analysis, [key]: value },
      }));
  }
  return (
    <div className="app-shell">
      <input
        ref={scriptInput}
        className="sr-only"
        type="file"
        accept=".pdf,.fdx,.txt"
        onChange={(e) => void upload(e)}
        aria-label="Upload screenplay"
      />
      <input
        ref={jsonInput}
        className="sr-only"
        type="file"
        accept=".json"
        onChange={(e) => void upload(e, true)}
        aria-label="Import project JSON"
      />
      <header className="topbar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            if (!busy) leaveProject();
          }}
        >
          <span className="brand-icon">
            <Layers3 size={21} />
          </span>
          Reverse Outliner<span className="beta">STUDIO</span>
        </a>
        <div className="top-actions">
          {project && (
            <>
              <span className="save-status">
                <Check size={13} />
                {saveState}
              </span>
              <IconButton
                label="Undo"
                disabled={!h?.past.length || !!busy}
                onClick={() => setH((prev) => (prev ? undo(prev) : prev))}
              >
                <Undo2 size={17} />
              </IconButton>
              <IconButton
                label="Redo"
                disabled={!h?.future.length || !!busy}
                onClick={() => setH((prev) => (prev ? redo(prev) : prev))}
              >
                <Redo2 size={17} />
              </IconButton>
              <button
                className="button subtle"
                onClick={() => exportProject(project)}
              >
                <Download size={15} />
                <span>Export JSON</span>
              </button>
            </>
          )}
          <button
            className="button subtle"
            disabled={!!busy}
            onClick={() => jsonInput.current?.click()}
          >
            <Upload size={15} />
            <span>Import JSON</span>
          </button>
        </div>
      </header>
      {error && (
        <div role="alert" className="error-banner">
          <span>{error}</span>
          <button aria-label="Dismiss error" onClick={() => setError("")}>
            <X size={16} />
          </button>
        </div>
      )}
      {!project ? (
        <main className="home">
          <div className="home-eyebrow">
            <span /> A CLOSER LOOK AT THE STORY
          </div>
          <h1>
            See the structure.
            <br />
            <span>Find the story.</span>
          </h1>
          <p className="home-subtitle">
            Unweave a screenplay into its scenes, characters, and emotional
            turns.
            <br />A thoughtful workspace for understanding how stories work.
          </p>
          <div
            className="upload-zone"
            onDragOver={(e) => e.preventDefault()}
            onDrop={async (e) => {
              e.preventDefault();
              if (busy) return;
              const file = e.dataTransfer.files[0];
              if (!file) return;
              setBusy("upload");
              try {
                openProject(await parseUpload(file));
                if (configured) setAnalysisDialog("all");
              } catch (err) {
                setError((err as Error).message);
              } finally {
                setBusy("");
              }
            }}
          >
            <div className="upload-symbol">
              <FileText size={28} strokeWidth={1.4} />
            </div>
            <h2>Start with a script</h2>
            <p>Drop your screenplay here, or choose a file.</p>
            <button
              className="button primary"
              disabled={!!busy}
              onClick={() => scriptInput.current?.click()}
            >
              {busy ? (
                <Loader2 size={16} className="spin" />
              ) : (
                <Upload size={16} />
              )}{" "}
              {busy ? "Reading your script…" : "Upload screenplay"}
            </button>
            <div className="file-types">
              PDF <span>·</span> Final Draft (.fdx) <span>·</span> Plain text
              (.txt)<span> / </span>25 MB max
            </div>
          </div>
          <div className="home-links">
            <button
              onClick={() => openProject(demoProject())}
              disabled={!!busy}
            >
              Explore a sample project <ChevronRight size={14} />
            </button>
            <button
              onClick={() => openProject(makeProject())}
              disabled={!!busy}
            >
              <FilePlus2 size={14} />
              Start a blank project
            </button>
          </div>
          {library.length > 0 && (
            <section className="library">
              <div className="section-title">
                YOUR PROJECTS <span>{library.length}</span>
              </div>
              {library.map((p) => (
                <button
                  className="project-row"
                  key={p.id}
                  onClick={() => openProject(p)}
                  disabled={!!busy}
                >
                  <span className="project-symbol">
                    <BookOpen size={20} />
                  </span>
                  <div>
                    <strong>{p.title || "Untitled project"}</strong>
                    <small>
                      {p.scenes.length} scenes · Edited{" "}
                      {new Date(p.updatedAt).toLocaleDateString()}
                    </small>
                  </div>
                  <ChevronRight size={18} />
                </button>
              ))}
            </section>
          )}
          <p className="privacy-note">
            Scripts stay in this browser. Only scenes you choose to analyze are
            sent to OpenAI.
            <br />
            Export JSON to back up your projects or move them to another device.
          </p>
        </main>
      ) : (
        <>
          <div className="project-bar">
            <div className="project-title-row">
              <IconButton
                label="Back to projects"
                disabled={!!busy}
                onClick={leaveProject}
              >
                <ArrowLeft size={18} />
              </IconButton>
              <div>
                <input
                  className="project-title"
                  aria-label="Project title"
                  maxLength={200}
                  value={project.title}
                  disabled={!!busy}
                  onChange={(e) =>
                    update((p) => ({ ...p, title: e.target.value }))
                  }
                />
                <div className="project-meta">
                  {project.source.name || "Manual project"}
                  <span>·</span>
                  {project.scenes.length} scenes<span>·</span>
                  {allCharacters.length} characters
                </div>
              </div>
            </div>
            <div className="project-actions">
              <button
                className="button subtle"
                disabled={!!busy}
                onClick={() => setShowReference(!showReference)}
              >
                <BookOpen size={16} />
                {showReference ? "Hide script" : "Show script"}
              </button>
              <button
                className="button primary"
                disabled={!!busy || !project.scenes.length}
                onClick={() => setAnalysisDialog("all")}
              >
                <Sparkles size={16} />
                Analyze script
              </button>
            </div>
          </div>
          {project.scenes.some((s) => !s.analysis.summary.trim()) && (
            <div className="summary-notice" role="status">
              <Sparkles size={18} />
              <div>
                <strong>
                  {configured
                    ? "Your scenes are ready for summaries."
                    : "Your script is parsed. Summaries need AI setup."}
                </strong>
                <p>
                  {configured
                    ? "Generate scene summaries, dramatic purpose, conflict, turning points, and emotional arcs with Analyze script."
                    : "No summaries have been generated for the empty scenes. Add your OpenAI API key to the server .env file, restart the app, then choose Analyze script. Your uploaded script is saved."}
                </p>
              </div>
              <button
                className="button subtle"
                disabled={!!busy}
                onClick={() => setAnalysisDialog("all")}
              >
                {configured ? "Generate summaries" : "View setup instructions"}
              </button>
            </div>
          )}
          <div className="workspace">
            <aside className="sidebar">
              <div className="view-switch">
                <button
                  className={view === "outline" ? "active" : ""}
                  onClick={() => {
                    setView("outline");
                    setCharacter("");
                  }}
                >
                  <Layers3 size={15} />
                  Outline
                </button>
                <button
                  className={view === "characters" ? "active" : ""}
                  onClick={() => setView("characters")}
                >
                  <Users size={15} />
                  Characters
                </button>
              </div>
              <label className="search">
                <Search size={15} />
                <input
                  placeholder="Find a scene…"
                  aria-label="Search scenes"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
              {view === "characters" && (
                <div className="character-filters">
                  <label className="field">
                    <span>FOLLOW A CHARACTER</span>
                    <select
                      aria-label="Character storyline"
                      value={character}
                      onChange={(e) => {
                        setCharacter(e.target.value);
                        const first = project.scenes.find(
                          (s) =>
                            !e.target.value ||
                            sceneHasCharacter(s, e.target.value),
                        );
                        if (first) setSelected(first.id);
                      }}
                    >
                      <option value="">All characters</option>
                      {allCharacters.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </label>
                  {character && (
                    <button
                      className="text-button"
                      disabled={!!busy}
                      onClick={() => {
                        const next = window
                          .prompt("Rename character everywhere", character)
                          ?.trim()
                          .toUpperCase();
                        if (next && next !== character && next.length <= 120) {
                          update((p) => renameCharacter(p, character, next));
                          setCharacter(next);
                        }
                      }}
                    >
                      Rename character
                    </button>
                  )}
                </div>
              )}
              <div className="list-heading">
                <span>
                  {character ? "STORYLINE" : "SCENES"} <b>{scenes.length}</b>
                </span>
                <IconButton
                  label="Add scene"
                  disabled={!!busy}
                  onClick={addScene}
                >
                  <Plus size={16} />
                </IconButton>
              </div>
              <div className="scene-list">
                {scenes.map((s) => {
                  const n = project.scenes.indexOf(s) + 1;
                  return (
                    <div
                      key={s.id}
                      className={`scene-row ${selected === s.id ? "selected" : ""} ${dragId === s.id ? "dragging" : ""}`}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (dragId && !busy)
                          update((p) => ({
                            ...p,
                            scenes: reorderScenes(p.scenes, dragId, s.id),
                          }));
                        setDragId("");
                      }}
                    >
                      <span
                        className="drag-handle"
                        draggable={!busy && !character && !search}
                        onDragStart={(e) => {
                          e.dataTransfer.effectAllowed = "move";
                          e.dataTransfer.setData("text/plain", s.id);
                          setDragId(s.id);
                        }}
                        onDragEnd={() => setDragId("")}
                        title="Drag to reorder scenes"
                      >
                        <GripVertical size={14} />
                      </span>
                      <button
                        className="scene-select"
                        onClick={() => setSelected(s.id)}
                      >
                        <span className="scene-number">
                          {String(n).padStart(2, "0")}
                        </span>
                        <span className="scene-row-copy">
                          <strong>{s.heading || "Untitled scene"}</strong>
                          <small>
                            {s.analysis.summary ||
                              `${s.characters.length} characters · Not analyzed yet`}
                          </small>
                          {character &&
                            s.analysis.emotions.find(
                              (e) => e.character === character,
                            ) && (
                              <span className="emotion-preview">
                                {s.analysis.emotions.find(
                                  (e) => e.character === character,
                                )?.before || "…"}{" "}
                                →{" "}
                                {s.analysis.emotions.find(
                                  (e) => e.character === character,
                                )?.after || "…"}
                              </span>
                            )}
                        </span>
                        {s.analyzed && (
                          <span className="analyzed-dot" title="Analyzed" />
                        )}
                      </button>
                    </div>
                  );
                })}
                {!scenes.length && (
                  <div className="empty-list">
                    {project.scenes.length
                      ? "No matching scenes."
                      : "Your outline starts here."}
                    <button
                      className="text-button"
                      onClick={addScene}
                      disabled={!!busy}
                    >
                      Add a scene
                    </button>
                  </div>
                )}
              </div>
              <div className="sidebar-footer">
                <span
                  className={`connection-dot ${configured ? "online" : ""}`}
                />
                {configured ? `AI ready · ${model}` : "AI setup needed"}
                <span className="local-label">LOCAL</span>
              </div>
            </aside>
            <main className="editor">
              {view === "characters" && character && (
                <section className="arc-header">
                  <div className="eyebrow">CHARACTER STORYLINE</div>
                  <h2>{character}</h2>
                  <p>
                    {scenes.length} scenes, in story order. Includes meaningful
                    off-screen involvement.
                  </p>
                  <div className="arc-track">
                    {scenes.map((s) => {
                      const e = s.analysis.emotions.find(
                        (e) => e.character === character,
                      );
                      return (
                        <button
                          key={s.id}
                          onClick={() => setSelected(s.id)}
                          className={selected === s.id ? "active" : ""}
                        >
                          <span>
                            {String(project.scenes.indexOf(s) + 1).padStart(
                              2,
                              "0",
                            )}
                          </span>
                          <strong>{e?.after || "Uncharted"}</strong>
                          <small>
                            {e?.involvement === "involved"
                              ? "Off-screen"
                              : "On-screen"}
                          </small>
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}
              {scene ? (
                <>
                  <div className="editor-heading">
                    <div>
                      <div className="eyebrow">
                        SCENE {String(activeNumber).padStart(2, "0")}{" "}
                        <span>
                          / {String(project.scenes.length).padStart(2, "0")}
                        </span>
                      </div>
                      <h2>
                        {scene.location || scene.heading || "Untitled scene"}
                      </h2>
                    </div>
                    <div className="editor-tools">
                      <IconButton
                        label="Move scene up"
                        disabled={!!busy || activeNumber === 1}
                        onClick={() => moveScene(scene.id, -1)}
                      >
                        <ArrowUp size={16} />
                      </IconButton>
                      <IconButton
                        label="Move scene down"
                        disabled={
                          !!busy || activeNumber === project.scenes.length
                        }
                        onClick={() => moveScene(scene.id, 1)}
                      >
                        <ArrowDown size={16} />
                      </IconButton>
                      <IconButton
                        label="Delete scene"
                        disabled={!!busy}
                        onClick={() => setPendingDelete(true)}
                      >
                        <Trash2 size={16} />
                      </IconButton>
                    </div>
                  </div>
                  <fieldset disabled={!!busy} className="scene-form">
                    <Field
                      label="Scene heading"
                      value={scene.heading}
                      onChange={(value) =>
                        changeScene(scene.id, (s) => ({ ...s, heading: value }))
                      }
                    />
                    <div className="two-fields">
                      <Field
                        label="Location"
                        value={scene.location}
                        onChange={(value) =>
                          changeScene(scene.id, (s) => ({
                            ...s,
                            location: value,
                          }))
                        }
                      />
                      <Field
                        label="Time of day"
                        value={scene.time}
                        onChange={(value) =>
                          changeScene(scene.id, (s) => ({ ...s, time: value }))
                        }
                      />
                    </div>
                    <div className="analysis-heading">
                      <span className="section-title">SCENE ANALYSIS</span>
                      <button
                        className="text-button"
                        disabled={!!busy}
                        onClick={() => setAnalysisDialog("scene")}
                      >
                        <Sparkles size={13} />
                        {scene.analyzed ? "Reanalyze scene" : "Analyze scene"}
                      </button>
                    </div>
                    <Field
                      label="Summary"
                      value={scene.analysis.summary}
                      multiline
                      onChange={(v) => setAnalysis("summary", v)}
                      placeholder="What happens in this scene?"
                    />
                    <Field
                      label="Dramatic purpose"
                      value={scene.analysis.purpose}
                      multiline
                      onChange={(v) => setAnalysis("purpose", v)}
                      placeholder="Why does this scene belong in the story?"
                    />
                    <div className="two-fields analysis-pair">
                      <Field
                        label="Conflict"
                        value={scene.analysis.conflict}
                        multiline
                        onChange={(v) => setAnalysis("conflict", v)}
                        placeholder="What opposing desires drive the scene?"
                      />
                      <Field
                        label="Turning point"
                        value={scene.analysis.turningPoint}
                        multiline
                        onChange={(v) => setAnalysis("turningPoint", v)}
                        placeholder="What changes the direction of the scene?"
                      />
                    </div>
                    <div className="analysis-heading">
                      <span className="section-title">
                        CHARACTERS & EMOTIONAL CHANGE
                      </span>
                    </div>
                    <CharacterInput
                      key={scene.id}
                      sceneId={scene.id}
                      names={scene.characters}
                      onChange={(names) =>
                        changeScene(scene.id, (s) => ({
                          ...s,
                          characters: names,
                        }))
                      }
                    />
                    {scene.analysis.emotions.map((emotion, i) => (
                      <div className="emotion-card" key={i}>
                        <div className="emotion-top">
                          <input
                            aria-label={`Arc ${i + 1} character`}
                            maxLength={120}
                            placeholder="Character name"
                            value={emotion.character}
                            onChange={(e) =>
                              changeScene(scene.id, (s) => ({
                                ...s,
                                analysis: {
                                  ...s.analysis,
                                  emotions: s.analysis.emotions.map((a, j) =>
                                    i === j
                                      ? {
                                          ...a,
                                          character:
                                            e.target.value.toUpperCase(),
                                        }
                                      : a,
                                  ),
                                },
                              }))
                            }
                          />
                          <select
                            aria-label={`Arc ${i + 1} involvement`}
                            value={emotion.involvement}
                            onChange={(e) =>
                              changeScene(scene.id, (s) => ({
                                ...s,
                                analysis: {
                                  ...s.analysis,
                                  emotions: s.analysis.emotions.map((a, j) =>
                                    i === j
                                      ? {
                                          ...a,
                                          involvement: e.target.value as
                                            "present" | "involved",
                                        }
                                      : a,
                                  ),
                                },
                              }))
                            }
                          >
                            <option value="present">On-screen</option>
                            <option value="involved">
                              Involved off-screen
                            </option>
                          </select>
                          <IconButton
                            label={`Remove arc ${i + 1}`}
                            disabled={!!busy}
                            onClick={() =>
                              changeScene(scene.id, (s) => ({
                                ...s,
                                analysis: {
                                  ...s.analysis,
                                  emotions: s.analysis.emotions.filter(
                                    (_, j) => i !== j,
                                  ),
                                },
                              }))
                            }
                          >
                            <X size={14} />
                          </IconButton>
                        </div>
                        <div className="two-fields">
                          {(["before", "after"] as const).map((key) => (
                            <Field
                              key={key}
                              label={`${emotion.character || "Character"} · ${key}`}
                              value={emotion[key]}
                              onChange={(v) =>
                                changeScene(scene.id, (s) => ({
                                  ...s,
                                  analysis: {
                                    ...s.analysis,
                                    emotions: s.analysis.emotions.map((a, j) =>
                                      j === i ? { ...a, [key]: v } : a,
                                    ),
                                  },
                                }))
                              }
                            />
                          ))}
                        </div>
                        <Field
                          label={`${emotion.character || "Character"} · emotional change`}
                          multiline
                          value={emotion.change}
                          onChange={(v) =>
                            changeScene(scene.id, (s) => ({
                              ...s,
                              analysis: {
                                ...s.analysis,
                                emotions: s.analysis.emotions.map((a, j) =>
                                  i === j ? { ...a, change: v } : a,
                                ),
                              },
                            }))
                          }
                        />
                      </div>
                    ))}
                    <button
                      className="button subtle add-arc"
                      onClick={() =>
                        changeScene(scene.id, (s) => ({
                          ...s,
                          analysis: {
                            ...s.analysis,
                            emotions: [
                              ...s.analysis.emotions,
                              {
                                character: "",
                                involvement: "present",
                                before: "",
                                after: "",
                                change: "",
                              },
                            ],
                          },
                        }))
                      }
                    >
                      <Plus size={14} />
                      Add character arc
                    </button>
                    <Field
                      label="Writer’s notes"
                      value={scene.notes}
                      multiline
                      onChange={(v) =>
                        changeScene(scene.id, (s) => ({ ...s, notes: v }))
                      }
                      placeholder="Patterns, questions, ideas for your own writing…"
                    />
                    <details className="source-editor">
                      <summary>Edit scene text and dialogue</summary>
                      <p>
                        Correct extracted text here. The original script remains
                        unchanged for reference. AI uses this scene text.
                      </p>
                      <Field
                        label="Scene text"
                        multiline
                        value={scene.sourceText}
                        onChange={(v) =>
                          changeScene(scene.id, (s) => ({
                            ...s,
                            sourceText: v,
                          }))
                        }
                      />
                      <div className="analysis-heading">
                        <span className="section-title">
                          EXTRACTED DIALOGUE
                        </span>
                        <button
                          className="text-button"
                          onClick={() =>
                            changeScene(scene.id, (s) => ({
                              ...s,
                              dialogue: [
                                ...s.dialogue,
                                { character: "", text: "" },
                              ],
                            }))
                          }
                        >
                          <Plus size={13} />
                          Add dialogue
                        </button>
                      </div>
                      {scene.dialogue.map((d, i) => (
                        <div className="dialogue-edit" key={i}>
                          <Field
                            label={`Dialogue ${i + 1} speaker`}
                            value={d.character}
                            onChange={(v) =>
                              changeScene(scene.id, (s) => ({
                                ...s,
                                dialogue: s.dialogue.map((a, j) =>
                                  j === i ? { ...a, character: v } : a,
                                ),
                              }))
                            }
                          />
                          <Field
                            label={`Dialogue ${i + 1} text`}
                            value={d.text}
                            multiline
                            onChange={(v) =>
                              changeScene(scene.id, (s) => ({
                                ...s,
                                dialogue: s.dialogue.map((a, j) =>
                                  j === i ? { ...a, text: v } : a,
                                ),
                              }))
                            }
                          />
                          <button
                            className="text-button"
                            onClick={() =>
                              changeScene(scene.id, (s) => ({
                                ...s,
                                dialogue: s.dialogue.filter((_, j) => i !== j),
                              }))
                            }
                          >
                            Remove dialogue
                          </button>
                        </div>
                      ))}
                      <p>
                        Dialogue records are editable annotations. Editing them
                        does not rewrite the scene text used by AI.
                      </p>
                    </details>
                  </fieldset>
                  <div className="editor-footnote">
                    Every field is yours to change. AI analysis is a starting
                    point.
                  </div>
                </>
              ) : (
                <div className="editor-empty">
                  <Layers3 size={36} strokeWidth={1} />
                  <h2>A little structure goes a long way.</h2>
                  <p>Select a scene, or add one to start your outline.</p>
                  <button
                    className="button primary"
                    disabled={!!busy}
                    onClick={addScene}
                  >
                    <Plus size={16} />
                    Add scene
                  </button>
                </div>
              )}
            </main>
            {showReference && (
              <aside className="reference">
                <div className="reference-heading">
                  <span>
                    <BookOpen size={15} />
                    SCRIPT REFERENCE
                  </span>
                  <IconButton
                    label="Close script reference"
                    onClick={() => setShowReference(false)}
                  >
                    <X size={15} />
                  </IconButton>
                </div>
                <div className="reference-tabs">
                  <button
                    className={referenceTab === "scene" ? "active" : ""}
                    onClick={() => setReferenceTab("scene")}
                  >
                    Current scene
                  </button>
                  <button
                    className={referenceTab === "full" ? "active" : ""}
                    onClick={() => setReferenceTab("full")}
                  >
                    Full script
                  </button>
                </div>
                <div className="script-paper">
                  <div className="script-label">
                    {referenceTab === "scene"
                      ? `SCENE ${String(activeNumber).padStart(2, "0")} · WORKING TEXT`
                      : "ORIGINAL SCRIPT"}
                  </div>
                  <pre>
                    {referenceTab === "scene"
                      ? scene?.sourceText ||
                        "No scene text yet. Add it under “Edit scene text and dialogue.”"
                      : project.source.text ||
                        "This project was created manually. Add scene text in the editor."}
                  </pre>
                </div>
                <div className="reference-footer">
                  {referenceTab === "scene"
                    ? "Scene text is editable in the outline."
                    : "Original text is preserved as uploaded."}
                </div>
              </aside>
            )}
          </div>
        </>
      )}
      {busy === "analysis" && (
        <div className="analysis-progress" role="status">
          <Loader2 className="spin" size={17} />
          <div>
            <strong>Reading the story</strong>
            <small>
              Analyzing scene {progress}. Completed scenes autosave.
            </small>
          </div>
          <button
            className="button subtle"
            onClick={() => controller.current?.abort()}
          >
            Stop
          </button>
        </div>
      )}
      {analysisDialog && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="analysis-title"
          >
            <span className="modal-symbol">
              <Sparkles size={24} />
            </span>
            <h2 id="analysis-title">
              {analysisDialog === "all"
                ? "Analyze this screenplay?"
                : "Analyze this scene?"}
            </h2>
            <p>
              {analysisDialog === "all"
                ? `${project?.scenes.length} scenes will be analyzed, one at a time.`
                : "The selected scene will be analyzed."}{" "}
              Scene text, the project title, and outline context will be sent to
              OpenAI. API usage may incur charges.
            </p>
            <p>
              New analysis replaces summaries, purpose, conflict, turning
              points, and emotional arcs for the selected scenes. You can undo
              each completed scene.
            </p>
            {!configured && (
              <div className="setup-note">
                Add <code>OPENAI_API_KEY</code> to the server <code>.env</code>{" "}
                file and restart the app to enable AI.
              </div>
            )}
            <div className="modal-actions">
              <button
                className="button subtle"
                onClick={() => setAnalysisDialog(null)}
              >
                Cancel
              </button>
              <button
                className="button primary"
                disabled={!configured}
                onClick={() => void runAnalysis(analysisDialog)}
              >
                <Sparkles size={15} />
                Start analysis
              </button>
            </div>
          </section>
        </div>
      )}
      {pendingDelete && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-title"
          >
            <h2 id="delete-title">Delete this scene?</h2>
            <p>
              The scene and its analysis will be removed. You can restore it
              with Undo.
            </p>
            <div className="modal-actions">
              <button
                className="button subtle"
                onClick={() => setPendingDelete(false)}
              >
                Keep scene
              </button>
              <button
                className="button danger"
                onClick={() => {
                  update((p) => ({
                    ...p,
                    scenes: p.scenes.filter((s) => s.id !== selected),
                  }));
                  setSelected(
                    project?.scenes.find((s) => s.id !== selected)?.id || "",
                  );
                  setPendingDelete(false);
                }}
              >
                Delete scene
              </button>
            </div>
          </section>
        </div>
      )}
      {storageBlocked && (
        <div className="storage-recovery">
          Saved data could not be loaded. Autosave is paused to preserve it.{" "}
          <button
            onClick={() => {
              if (
                window.confirm(
                  "Replace the unreadable saved library? Export any open work first.",
                )
              ) {
                setStorageBlocked(false);
                setError("");
              }
            }}
          >
            Reset local library
          </button>
        </div>
      )}
    </div>
  );
}
