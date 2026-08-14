const lamp = document.getElementById("lamp");
const phaseLabel = document.getElementById("phase-label");
const detail = document.getElementById("detail");
const url = document.getElementById("url");
const workspace = document.getElementById("workspace");
const chooseWorkspace = document.getElementById("choose-workspace");
const log = document.getElementById("log");
const retry = document.getElementById("retry");
const update = document.getElementById("update");
const enter = document.getElementById("enter");
const version = document.getElementById("version");
const clock = document.getElementById("clock");
const eyebrow = document.getElementById("eyebrow");
const subtitle = document.getElementById("subtitle");
const labelUrl = document.getElementById("label-url");
const labelWorkspace = document.getElementById("label-workspace");
const labelVersion = document.getElementById("label-version");
const logLabel = document.getElementById("log-label");
const langEn = document.getElementById("lang-en");
const langZh = document.getElementById("lang-zh");

let currentLocale = "en";

function canEnter(state) {
  return (state.phase === "ready" || state.phase === "attached") && Boolean(state.url);
}

function applyStaticCopy(locale) {
  const copy = window.harnessCopy(locale);
  document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
  eyebrow.textContent = copy.eyebrow;
  subtitle.textContent = copy.subtitle;
  labelUrl.textContent = copy.url;
  labelWorkspace.textContent = copy.workspace;
  labelVersion.textContent = copy.version;
  chooseWorkspace.textContent = copy.change;
  enter.textContent = copy.start;
  update.textContent = copy.update;
  retry.textContent = copy.restart;
  logLabel.textContent = copy.log;
  langEn.classList.toggle("active", locale === "en");
  langZh.classList.toggle("active", locale === "zh");
}

function render(state) {
  if (!state) return;
  currentLocale = state.locale === "zh" ? "zh" : "en";
  const copy = window.harnessCopy(currentLocale);
  applyStaticCopy(currentLocale);
  lamp.dataset.phase = state.phase;
  phaseLabel.textContent = state.phase;
  detail.textContent = state.error || copy.detail[state.phase] || state.phase;
  url.textContent = state.url || (state.port ? `http://${state.host}:${state.port}` : "—");
  workspace.textContent = state.workspace || "—";
  workspace.title = state.workspace || "";
  const source = state.runtimeSource === "overlay" ? copy.overlay : copy.bundled;
  version.textContent = state.dshVersion ? `${state.dshVersion} (${source})` : source;
  log.textContent = (state.logs || []).join("\n");
  log.scrollTop = log.scrollHeight;
  retry.hidden = state.phase !== "error";
  const busy = state.phase === "updating" || state.phase === "starting" || state.phase === "waiting";
  update.disabled = busy;
  retry.disabled = busy;
  chooseWorkspace.disabled = busy;
  enter.disabled = !canEnter(state);
}

function tick() {
  clock.textContent = new Date().toLocaleTimeString(window.harnessClockLocale(currentLocale));
}

applyStaticCopy("en");
tick();
setInterval(tick, 1000);

const api = window.harnessDesktop;
if (!api) {
  render({
    phase: "error",
    error: window.harnessCopy("en").bridgeMissing,
    host: "127.0.0.1",
    port: null,
    url: null,
    workspace: "",
    logs: [],
    locale: "en",
  });
} else {
  api.getState().then(render);
  api.onState(render);
  retry.addEventListener("click", () => {
    retry.disabled = true;
    api.retry().finally(() => {
      retry.disabled = false;
    });
  });
  update.addEventListener("click", () => {
    update.disabled = true;
    api.update().finally(() => {
      update.disabled = false;
    });
  });
  enter.addEventListener("click", () => {
    if (enter.disabled) return;
    enter.disabled = true;
    api.enter().finally(() => {
      enter.disabled = false;
    });
  });
  chooseWorkspace.addEventListener("click", () => {
    if (chooseWorkspace.disabled) return;
    chooseWorkspace.disabled = true;
    api.chooseWorkspace().finally(() => {
      chooseWorkspace.disabled = false;
    });
  });
  function bindLocale(button, locale) {
    button.addEventListener("click", () => {
      currentLocale = locale;
      applyStaticCopy(locale);
      tick();
      api.setLocale(locale).then(render);
    });
  }
  bindLocale(langEn, "en");
  bindLocale(langZh, "zh");
}
