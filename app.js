(() => {
  const blankUser = () => ({
    name: "",
    ev: "",
    alignment: "1",
    selected: true,
    scarf: false,
  });
  const blankOpponent = () => ({
    name: "",
    selected: true,
    scarf: false,
    selectedScenarios: ["32", "32+"],
  });
  const state = {
    pokemon: [],
    user: Array(6).fill(null).map(blankUser),
    opponents: Array(6).fill(null).map(blankOpponent),
    userTailwind: false,
    opponentTailwind: false,
    trickRoom: false,
  };
  let savedTeam = null;
  try {
    savedTeam = localStorage.getItem("pokemon-speed-ranking-team");
  } catch (_) {
    /* Storage may be unavailable in restricted browser modes. */
  }
  if (savedTeam) {
    try {
      const parsed = JSON.parse(savedTeam);
      if (Array.isArray(parsed) && parsed.length === 6)
        state.user = parsed.map((mon) => ({ ...blankUser(), ...mon }));
    } catch (_) {
      /* Ignore malformed local data and start with a blank team. */
    }
  }
  const $ = (id) => document.getElementById(id);
  const escapeHtml = (value) =>
    String(value).replace(
      /[&<>'"]/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          "'": "&#39;",
          '"': "&quot;",
        })[c],
    );
  const findPokemon = (name) =>
    state.pokemon.find(
      (p) => p.name.toLowerCase() === name.trim().toLowerCase(),
    );
  const iconUrl = (formeId) => `img/icons/${encodeURIComponent(formeId)}.png`;
  const iconMarkup = (formeId, name) =>
    formeId
      ? `<img class="mon-icon" src="${iconUrl(formeId)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">`
      : "";
  const alignmentOptions = (selected) =>
    `<option value="1" ${selected === "1" ? "selected" : ""}>Neutral</option><option value="1.1" ${selected === "1.1" ? "selected" : ""}>Positive</option><option value="0.9" ${selected === "0.9" ? "selected" : ""}>Negative</option>`;
  const alignmentLabel = (alignment) =>
    ({ 0.9: "negative", 1: "neutral", 1.1: "positive" })[String(alignment)] ||
    "neutral";

  function renderUserSlots() {
    $("user-slots").innerHTML = state.user
      .map(
        (mon, i) => `
      <div class="slot user-slot ${mon.selected ? "" : "inactive"}">
        <div class="active-check" title="Include this Pokémon in the ranking"><input class="user-active" type="checkbox" aria-label="Include your Pokémon ${i + 1}" data-index="${i}" ${mon.selected ? "checked" : ""}><span></span></div>
        <div class="search-wrap"><input class="search-input user-search" type="text" autocomplete="off" placeholder="Search Pokémon…" aria-label="Your Pokémon ${i + 1}" data-index="${i}" value="${escapeHtml(mon.name)}"><div class="suggestions" data-suggestions="user-${i}"></div></div>
        <input class="ev-input" type="number" min="0" step="1" placeholder="EV" aria-label="Your Pokémon ${i + 1} EV" data-index="${i}" value="${mon.ev}">
        <select class="alignment-input" aria-label="Your Pokémon ${i + 1} alignment" data-index="${i}">${alignmentOptions(mon.alignment)}</select>
        <label class="scarf-option"><input class="scarf-check user-scarf" type="checkbox" aria-label="Choice Scarf for your Pokémon ${i + 1}" data-index="${i}" ${mon.scarf ? "checked" : ""}><span>Scarf</span></label>
        <button class="button button-danger" type="button" data-clear-user="${i}" aria-label="Clear your Pokémon ${i + 1}">Clear</button>
      </div>`,
      )
      .join("");
  }
  function renderOpponentSlots() {
    $("opponent-slots").innerHTML = state.opponents
      .map(
        (mon, i) => `
      <div class="slot opponent-slot ${mon.selected ? "" : "inactive"}">
        <div class="active-check" title="Include this Pokémon in the ranking"><input class="opponent-active" type="checkbox" aria-label="Include opposing Pokémon ${i + 1}" data-index="${i}" ${mon.selected ? "checked" : ""}><span></span></div>
        <div class="search-wrap"><input class="search-input opponent-search" type="text" autocomplete="off" placeholder="Search Pokémon…" aria-label="Opposing Pokémon ${i + 1}" data-index="${i}" value="${escapeHtml(mon.name)}"><div class="suggestions" data-suggestions="opponent-${i}"></div></div>
        <div class="confirm-options" aria-label="Confirmed opposing speed scenario">
          ${[
            ["0-", "0-"],
            ["0", "0"],
            ["32", "32"],
            ["32+", "32+"],
          ]
            .map(
              ([value, label]) =>
                `<label class="scenario"><input type="checkbox" class="scenario-check" data-index="${i}" data-scenario="${value}" ${mon.selectedScenarios.includes(value) ? "checked" : ""}><span>${label}</span></label>`,
            )
            .join("")}
        </div>
        <label class="scarf-option"><input class="scarf-check opponent-scarf" type="checkbox" aria-label="Choice Scarf for opposing Pokémon ${i + 1}" data-index="${i}" ${mon.scarf ? "checked" : ""}><span>Scarf</span></label>
        <button class="button button-danger" type="button" data-clear-opponent="${i}" aria-label="Clear opposing Pokémon ${i + 1}">Clear</button>
      </div>`,
      )
      .join("");
  }
  function showSuggestions(side, index, query) {
    const box = document.querySelector(`[data-suggestions="${side}-${index}"]`);
    const matches = state.pokemon
      .filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 12);
    box.innerHTML = matches
      .map(
        (p) =>
          `<div class="suggestion" data-pick="${escapeHtml(p.name)}" data-side="${side}" data-index="${index}">${iconMarkup(p.formeId, p.name)}${escapeHtml(p.name)}</div>`,
      )
      .join("");
    box.classList.toggle("open", query.length > 0 && matches.length > 0);
  }
  function addEntry(entries, name, speed, side, meta, base, formeId) {
    entries.push({ name, speed, side, meta, base, formeId });
  }
  function applySpeedModifiers(rawSpeed, scarf, tailwind) {
    if (scarf && tailwind) return Math.floor(rawSpeed * 3); // Matches 87 -> 130 -> 261.
    const scarfSpeed = scarf ? Math.floor(rawSpeed * 1.5) : rawSpeed;
    return tailwind ? scarfSpeed * 2 : scarfSpeed;
  }
  function renderRanking() {
    const entries = [];
    const userMultiplier = state.userTailwind ? 2 : 1;
    state.user.forEach((mon, i) => {
      const data = findPokemon(mon.name);
      if (!data || !mon.selected || mon.ev === "") return;
      const speed = applySpeedModifiers(
        Math.floor((data.base + Number(mon.ev) + 20) * Number(mon.alignment)),
        mon.scarf,
        state.userTailwind,
      );
      addEntry(
        entries,
        data.name,
        speed,
        "user",
        `${mon.ev} EV · ${alignmentLabel(mon.alignment)}`,
        data.base,
        data.formeId,
      );
    });
    const opponentMultiplier = state.opponentTailwind ? 2 : 1;
    state.opponents.forEach((mon) => {
      const data = findPokemon(mon.name);
      if (!data || !mon.selected) return;
      const scenarios = {
        "0-": [0, 0.9],
        0: [0, 1],
        32: [32, 1],
        "32+": [32, 1.1],
      };
      const selectedScenarios = mon.selectedScenarios || ["32", "32+"];
      selectedScenarios.forEach((label) => {
        const [ev, alignment] = scenarios[label];
        addEntry(
          entries,
          data.name,
          applySpeedModifiers(
            Math.floor((data.base + ev + 20) * alignment),
            mon.scarf,
            state.opponentTailwind,
          ),
          "opponent",
          `${label} EV${label.endsWith("+") ? " · positive" : label.endsWith("-") ? " · negative" : " · neutral"}`,
          data.base,
          data.formeId,
        );
      });
    });
    entries.sort((a, b) =>
      state.trickRoom ? a.speed - b.speed : b.speed - a.speed,
    );
    $("ranking-count").textContent =
      `${entries.length} entr${entries.length === 1 ? "y" : "ies"}`;
    $("ranking-empty").hidden = entries.length > 0;
    $("ranking-list").innerHTML = entries
      .map(
        (entry, i) =>
          `<li class="ranking-item ${entry.side}"><span class="rank">${i + 1}</span>${iconMarkup(entry.formeId, entry.name)}<span><span class="mon-name">${escapeHtml(entry.name)}</span><span class="mon-meta"> · ${entry.meta} · base ${entry.base}</span></span><span class="speed-value">${entry.speed}</span><span class="tag ${entry.side}">${entry.side === "user" ? "You" : "Opponent"}</span></li>`,
      )
      .join("");
  }
  function update() {
    renderUserSlots();
    renderOpponentSlots();
    renderRanking();
  }
  function setSearchValue(side, index, value) {
    state[side][index].name = value;
  }

  document.addEventListener("input", (event) => {
    const target = event.target;
    if (target.matches(".search-input")) {
      const side = target.classList.contains("user-search")
        ? "user"
        : "opponents";
      setSearchValue(side, target.dataset.index, target.value);
      showSuggestions(
        side === "user" ? "user" : "opponent",
        target.dataset.index,
        target.value,
      );
      renderRanking();
    }
    if (target.matches(".ev-input")) {
      state.user[target.dataset.index].ev = target.value;
      renderRanking();
    }
  });
  document.addEventListener("change", (event) => {
    const target = event.target;
    if (target.matches(".user-active")) {
      state.user[target.dataset.index].selected = target.checked;
      target.closest(".slot").classList.toggle("inactive", !target.checked);
      renderRanking();
    }
    if (target.matches(".opponent-active")) {
      state.opponents[target.dataset.index].selected = target.checked;
      target.closest(".slot").classList.toggle("inactive", !target.checked);
      renderRanking();
    }
    if (target.matches(".scarf-check")) {
      const team = target.classList.contains("user-scarf")
        ? state.user
        : state.opponents;
      team[target.dataset.index].scarf = target.checked;
      renderRanking();
    }
    if (target.matches(".alignment-input")) {
      state.user[target.dataset.index].alignment = target.value;
      renderRanking();
    }
    if (target.matches(".scenario-check")) {
      const selected = state.opponents[target.dataset.index].selectedScenarios;
      if (target.checked && !selected.includes(target.dataset.scenario))
        selected.push(target.dataset.scenario);
      if (!target.checked)
        state.opponents[target.dataset.index].selectedScenarios =
          selected.filter((value) => value !== target.dataset.scenario);
      renderRanking();
    }
  });
  document.addEventListener("click", (event) => {
    const pick = event.target.closest("[data-pick]");
    if (pick) {
      const side = pick.dataset.side === "user" ? "user" : "opponents";
      setSearchValue(side, pick.dataset.index, pick.dataset.pick);
      update();
      return;
    }
    const clearUser = event.target.closest("[data-clear-user]");
    if (clearUser) {
      state.user[clearUser.dataset.clearUser] = blankUser();
      update();
      return;
    }
    const clearOpponent = event.target.closest("[data-clear-opponent]");
    if (clearOpponent) {
      state.opponents[clearOpponent.dataset.clearOpponent] = blankOpponent();
      update();
      return;
    }
    if (!event.target.closest(".search-wrap"))
      document
        .querySelectorAll(".suggestions")
        .forEach((box) => box.classList.remove("open"));
  });
  $("clear-user").addEventListener("click", () => {
    state.user = Array(6).fill(null).map(blankUser);
    update();
  });
  $("save-user").addEventListener("click", () => {
    try {
      localStorage.setItem(
        "pokemon-speed-ranking-team",
        JSON.stringify(state.user),
      );
    } catch (_) {
      return;
    }
    const button = $("save-user");
    const original = button.textContent;
    button.textContent = "Saved";
    setTimeout(() => {
      button.textContent = original;
    }, 1200);
  });
  $("select-all-user").addEventListener("click", () => {
    state.user.forEach((mon) => {
      mon.selected = true;
    });
    update();
  });
  $("clear-opponents").addEventListener("click", () => {
    state.opponents = Array(6).fill(null).map(blankOpponent);
    update();
  });
  $("user-tailwind").addEventListener("change", (e) => {
    state.userTailwind = e.target.checked;
    renderRanking();
  });
  $("opponent-tailwind").addEventListener("change", (e) => {
    state.opponentTailwind = e.target.checked;
    renderRanking();
  });
  $("trick-room").addEventListener("change", (e) => {
    state.trickRoom = e.target.checked;
    renderRanking();
  });

  fetch("speeds.json")
    .then((response) => {
      if (!response.ok) throw new Error("Could not read speeds.json");
      return response.json();
    })
    .then((groups) => {
      state.pokemon = groups.flatMap((group) =>
        group.pokemon.map((p) => ({ ...p, base: Number(group.baseSpeedStat) })),
      );
      $("data-status").textContent = `${state.pokemon.length} Pokémon loaded`;
      $("data-status").className = "status ready";
      renderRanking();
    })
    .catch(() => {
      $("data-status").textContent =
        "Could not load speeds.json — use a local server";
      $("data-status").className = "status error";
    });
  update();
})();
