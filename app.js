const STORAGE_KEY = "home-poker-chip-manager-v1";

const els = {
  createGroupForm: document.getElementById("create-group-form"),
  joinGroupForm: document.getElementById("join-group-form"),
  createUserForm: document.getElementById("create-user-form"),
  createGameForm: document.getElementById("create-game-form"),
  chipEntryForm: document.getElementById("chip-entry-form"),
  settlementForm: document.getElementById("settlement-form"),
  groupList: document.getElementById("group-list"),
  userList: document.getElementById("user-list"),
  accountSummary: document.getElementById("account-summary"),
  historyList: document.getElementById("history-list"),
  openGames: document.getElementById("open-games"),
  joinGroupId: document.getElementById("join-group-id"),
  joinUserId: document.getElementById("join-user-id"),
  gameGroupId: document.getElementById("game-group-id"),
  gameBankerId: document.getElementById("game-banker-id"),
  chipGameId: document.getElementById("chip-game-id"),
  chipUserId: document.getElementById("chip-user-id"),
  settleFrom: document.getElementById("settle-from"),
  settleTo: document.getElementById("settle-to")
};

let state = loadState();
render();

els.createGroupForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = document.getElementById("group-name").value.trim();
  const secretWord = document.getElementById("group-secret").value.trim();
  if (!name || !secretWord) return;

  state.groups.push({
    id: makeId("grp"),
    name,
    secretWord,
    memberIds: [],
    createdAt: new Date().toISOString()
  });

  event.target.reset();
  persistAndRender();
});

els.joinGroupForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const groupId = els.joinGroupId.value;
  const userId = els.joinUserId.value;
  const secret = document.getElementById("join-secret").value.trim();

  const group = state.groups.find((g) => g.id === groupId);
  if (!group || group.secretWord !== secret) {
    window.alert("Secret word did not match this group.");
    return;
  }

  if (!group.memberIds.includes(userId)) {
    group.memberIds.push(userId);
  }

  event.target.reset();
  persistAndRender();
});

els.createUserForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = document.getElementById("user-name").value.trim();
  const nickname = document.getElementById("user-nickname").value.trim();
  if (!name) return;

  state.users.push({
    id: makeId("usr"),
    name,
    nickname,
    active: true,
    createdAt: new Date().toISOString()
  });

  event.target.reset();
  persistAndRender();
});

els.createGameForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const groupId = els.gameGroupId.value;
  const name = document.getElementById("game-name").value.trim();
  const bankerId = els.gameBankerId.value;

  if (!groupId || !name || !bankerId) return;

  state.games.push({
    id: makeId("gme"),
    groupId,
    name,
    bankerId,
    status: "open",
    entries: [],
    settlements: [],
    createdAt: new Date().toISOString(),
    closedAt: null
  });

  event.target.reset();
  persistAndRender();
});

els.chipEntryForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const game = state.games.find((g) => g.id === els.chipGameId.value && g.status === "open");
  if (!game) {
    window.alert("Pick an open game first.");
    return;
  }

  game.entries.push({
    id: makeId("ent"),
    userId: els.chipUserId.value,
    buyIn: numberValue("chip-buyin"),
    cashOut: numberValue("chip-cashout"),
    adjustment: numberValue("chip-adjustment"),
    timestamp: new Date().toISOString()
  });

  event.target.reset();
  document.getElementById("chip-buyin").value = "0";
  document.getElementById("chip-cashout").value = "0";
  document.getElementById("chip-adjustment").value = "0";
  persistAndRender();
});

els.settlementForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const fromUserId = els.settleFrom.value;
  const toUserId = els.settleTo.value;
  const amount = numberValue("settle-amount");

  if (fromUserId === toUserId) {
    window.alert("Debtor and creditor must be different players.");
    return;
  }

  const openGame = state.games.find((g) => g.status === "open");
  if (!openGame) {
    window.alert("Create or keep one game open to log settlements.");
    return;
  }

  openGame.settlements.push({
    id: makeId("set"),
    fromUserId,
    toUserId,
    amount,
    timestamp: new Date().toISOString()
  });

  event.target.reset();
  persistAndRender();
});

function render() {
  renderOptions();
  renderGroups();
  renderUsers();
  renderOpenGames();
  renderAccounts();
  renderHistory();
}

function renderOptions() {
  fillSelect(els.joinGroupId, state.groups, (g) => g.name);
  fillSelect(els.gameGroupId, state.groups, (g) => g.name);

  const activeUsers = state.users.filter((u) => u.active);
  fillSelect(els.joinUserId, activeUsers, userLabel);
  fillSelect(els.gameBankerId, activeUsers, userLabel);
  fillSelect(els.chipUserId, activeUsers, userLabel);
  fillSelect(els.settleFrom, activeUsers, userLabel);
  fillSelect(els.settleTo, activeUsers, userLabel);

  const openGames = state.games.filter((g) => g.status === "open");
  fillSelect(els.chipGameId, openGames, (g) => `${g.name} (${groupName(g.groupId)})`);
}

function renderGroups() {
  els.groupList.innerHTML = "";
  for (const group of state.groups) {
    const memberNames = group.memberIds.map(userName).filter(Boolean).join(", ") || "No members yet";
    const item = buildItem(`<strong>${group.name}</strong><span>Members: ${memberNames}</span>`);
    els.groupList.append(item);
  }
}

function renderUsers() {
  els.userList.innerHTML = "";
  for (const user of state.users) {
    const item = buildItem(`
      <strong>${userLabel(user)}</strong>
      <span>Status: ${user.active ? "Active" : "Inactive"}</span>
      <div class="inline-actions">
        <button class="secondary" data-toggle-user="${user.id}">${user.active ? "Deactivate" : "Activate"}</button>
      </div>
    `);

    item.querySelector("[data-toggle-user]").addEventListener("click", () => {
      user.active = !user.active;
      persistAndRender();
    });

    els.userList.append(item);
  }
}

function renderOpenGames() {
  els.openGames.innerHTML = "";
  const openGames = state.games.filter((g) => g.status === "open");

  if (openGames.length === 0) {
    els.openGames.append(buildItem("<span>No open games.</span>"));
    return;
  }

  for (const game of openGames) {
    const totals = perGameNet(game);
    const players = Object.entries(totals)
      .map(([userId, amount]) => `${userName(userId)}: ${formatMoney(amount)}`)
      .join(" | ") || "No chip entries yet";

    const item = buildItem(`
      <strong>${game.name}</strong>
      <span>Group: ${groupName(game.groupId)} | Banker: ${userName(game.bankerId)}</span>
      <span>Per-player net: ${players}</span>
      <div class="inline-actions">
        <button class="warning" data-close-game="${game.id}">Close Game</button>
      </div>
    `);

    item.querySelector("[data-close-game]").addEventListener("click", () => {
      game.status = "closed";
      game.closedAt = new Date().toISOString();
      persistAndRender();
    });

    els.openGames.append(item);
  }
}

function renderAccounts() {
  els.accountSummary.innerHTML = "";
  const balances = computeBalances();

  for (const user of state.users) {
    const amount = balances[user.id] || 0;
    const klass = amount >= 0 ? "amount-positive" : "amount-negative";
    const pill = document.createElement("div");
    pill.className = "pill";
    pill.innerHTML = `<strong>${userLabel(user)}</strong><div class="${klass}">${formatMoney(amount)}</div>`;
    els.accountSummary.append(pill);
  }
}

function renderHistory() {
  els.historyList.innerHTML = "";
  const closedGames = state.games
    .filter((g) => g.status === "closed")
    .sort((a, b) => new Date(b.closedAt || 0) - new Date(a.closedAt || 0));

  if (closedGames.length === 0) {
    els.historyList.append(buildItem("<span>No closed games yet.</span>"));
    return;
  }

  for (const game of closedGames) {
    const totals = perGameNet(game);
    const lines = Object.entries(totals)
      .map(([userId, amount]) => `${userName(userId)}: ${formatMoney(amount)}`)
      .join(" | ");

    const settlementTotal = game.settlements.reduce((sum, s) => sum + s.amount, 0);

    els.historyList.append(
      buildItem(`
        <strong>${game.name}</strong>
        <span>Closed: ${new Date(game.closedAt).toLocaleString()}</span>
        <span>Group: ${groupName(game.groupId)} | Banker: ${userName(game.bankerId)}</span>
        <span>Player net: ${lines || "N/A"}</span>
        <span>Settlements logged: ${formatMoney(settlementTotal)}</span>
      `)
    );
  }
}

function perGameNet(game) {
  const totals = {};

  for (const entry of game.entries) {
    totals[entry.userId] = (totals[entry.userId] || 0) + entry.cashOut + entry.adjustment - entry.buyIn;
  }

  return totals;
}

function computeBalances() {
  const balances = {};

  for (const user of state.users) balances[user.id] = 0;

  for (const game of state.games) {
    const net = perGameNet(game);
    for (const [userId, value] of Object.entries(net)) {
      balances[userId] = (balances[userId] || 0) + value;
    }

    for (const settlement of game.settlements) {
      balances[settlement.fromUserId] = (balances[settlement.fromUserId] || 0) + settlement.amount;
      balances[settlement.toUserId] = (balances[settlement.toUserId] || 0) - settlement.amount;
    }
  }

  return balances;
}

function fillSelect(select, items, labelFn) {
  const previous = select.value;
  select.innerHTML = "";

  if (items.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No options available";
    select.append(option);
    return;
  }

  for (const item of items) {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = labelFn(item);
    select.append(option);
  }

  const hasPrevious = items.some((i) => i.id === previous);
  if (hasPrevious) select.value = previous;
}

function buildItem(html) {
  const item = document.createElement("div");
  item.className = "list-item";
  item.innerHTML = html;
  return item;
}

function persistAndRender() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  render();
}

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (parsed && parsed.groups && parsed.users && parsed.games) {
      return parsed;
    }
  } catch (error) {
    console.warn("Failed to load state", error);
  }

  return {
    groups: [],
    users: [],
    games: []
  };
}

function userName(userId) {
  const user = state.users.find((u) => u.id === userId);
  return user ? userLabel(user) : "Unknown user";
}

function userLabel(user) {
  return user.nickname ? `${user.name} (${user.nickname})` : user.name;
}

function groupName(groupId) {
  const group = state.groups.find((g) => g.id === groupId);
  return group ? group.name : "Unknown group";
}

function makeId(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function numberValue(id) {
  const value = Number(document.getElementById(id).value);
  return Number.isFinite(value) ? value : 0;
}

function formatMoney(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  }).format(amount);
}
