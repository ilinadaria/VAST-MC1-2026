window.VastApp = window.VastApp || {};

window.VastApp.internalStateHeatmap = {
  stateOrder: [
    "reacting",
    "rationalizing",
    "deliberating",
    "none"
  ],

  stateLabels: {
    reacting: "Reacting",
    rationalizing: "Rationalizing",
    deliberating: "Deliberating",
    none: "No state"
  },

  stateDescriptions: {
    reacting:
      "Immediate response to the current event or new information.",
    rationalizing:
      "Explaining or justifying a position, interpretation, or action.",
    deliberating:
      "Weighing options, risks, and possible next steps.",
    none:
      "No internal-state text was recorded."
  },

  render() {
    const app = window.VastApp;
    const target =
      document.querySelector("#internalStateHeatmap");
    const legend =
      document.querySelector("#internalStateLegend");

    if (!target || !legend) {
      console.error(
        "Internal-state heatmap targets not found."
      );
      return;
    }

    const rounds =
      window.VAST_DATA?.rounds || [];
    const agents =
      app.agents.getAll(window.VAST_DATA);

    legend.replaceChildren(
      ...this.createLegendItems()
    );

    const grid =
      document.createElement("div");

    grid.className =
      "internal-state-grid";
    grid.style.gridTemplateColumns =
      `74px repeat(${Math.max(1, rounds.length)}, minmax(0, 1fr))`;
    grid.style.gridTemplateRows =
      `repeat(${Math.max(1, agents.length)}, minmax(24px, 1fr))`;

    agents.forEach(agent => {
      grid.append(
        this.createAgentHeader(agent)
      );

      rounds.forEach((round, roundIndex) => {
        const cellData =
          this.buildCellData(
            round,
            roundIndex,
            agent
          );

        grid.append(
          this.createCell(cellData)
        );
      });
    });

    target.replaceChildren(grid);
    this.ensureTooltip();
  },

  createLegendItems() {
    return this.stateOrder.map(state => {
      const item =
        document.createElement("span");
      const swatch =
        document.createElement("span");

      item.className =
        "internal-state-legend-item";
      swatch.className =
        `internal-state-legend-swatch state-${state}`;

      item.append(
        swatch,
        document.createTextNode(
          this.stateLabels[state]
        )
      );

      item.addEventListener(
        "mouseenter",
        event => {
          this.showLegendTooltip(
            event,
            state
          );
        }
      );

      item.addEventListener(
        "mousemove",
        event => {
          this.moveLegendTooltip(event);
        }
      );

      item.addEventListener(
        "mouseleave",
        () => {
          this.hideLegendTooltip();
        }
      );

      return item;
    });
  },

  ensureLegendTooltip() {
    let tooltip =
      document.querySelector(
        "#internalStateLegendTooltip"
      );

    if (tooltip) {
      return tooltip;
    }

    tooltip =
      document.createElement("div");
    tooltip.id =
      "internalStateLegendTooltip";
    tooltip.className =
      "internal-state-legend-tooltip";
    tooltip.hidden =
      true;

    document.body.append(tooltip);
    return tooltip;
  },

  showLegendTooltip(event, state) {
    const tooltip =
      this.ensureLegendTooltip();

    tooltip.innerHTML = `
      <strong>
        ${this.escapeHtml(
          this.stateLabels[state]
        )}
      </strong>
      <span>
        ${this.escapeHtml(
          this.stateDescriptions[state]
        )}
      </span>
    `;

    tooltip.hidden = false;
    this.moveLegendTooltip(event);
  },

  moveLegendTooltip(event) {
    const tooltip =
      this.ensureLegendTooltip();
    const offset = 10;

    const left = Math.min(
      event.clientX + offset,
      window.innerWidth -
        tooltip.offsetWidth -
        8
    );

    const top = Math.min(
      event.clientY + offset,
      window.innerHeight -
        tooltip.offsetHeight -
        8
    );

    tooltip.style.left =
      `${Math.max(8, left)}px`;
    tooltip.style.top =
      `${Math.max(8, top)}px`;
  },

  hideLegendTooltip() {
    const tooltip =
      document.querySelector(
        "#internalStateLegendTooltip"
      );

    if (tooltip) {
      tooltip.hidden = true;
    }
  },

  createCornerCell() {
    const cell =
      document.createElement("div");

    cell.className =
      "internal-state-corner";

    return cell;
  },

  createAgentHeader(agent) {
    const header =
      document.createElement("div");

    header.className =
      "internal-state-agent-label";
    header.textContent =
      this.shortAgentName(agent);
    header.title =
      window.VastApp.agents.displayName(agent);

    return header;
  },

  createRoundLabel(roundIndex) {
    const label =
      document.createElement("button");

    label.type =
      "button";
    label.className =
      "internal-state-round-label";
    label.textContent =
      `R${roundIndex + 1}`;

    if (roundIndex === 21) {
      label.classList.add(
        "embargo-round-label"
      );
    }

    label.addEventListener(
      "click",
      () => this.selectRound(roundIndex)
    );

    return label;
  },

  buildCellData(
    round,
    roundIndex,
    agent
  ) {
    const messages =
      (round.communications || [])
        .filter(message =>
          message.agent_id === agent.agent_id
        );

    const counts = {
      reacting: 0,
      rationalizing: 0,
      deliberating: 0
    };

    const entries = [];

    messages.forEach(message => {
      const state =
        message.internal_state;

      if (
        !state ||
        typeof state !== "object"
      ) {
        return;
      }

      [
        "reacting",
        "rationalizing",
        "deliberating"
      ].forEach(mode => {
        const value =
          state[mode];

        if (
          value === null ||
          value === undefined ||
          value === ""
        ) {
          return;
        }

        counts[mode] += 1;
        entries.push({
          mode,
          text: String(value).trim(),
          timestamp:
            message.timestamp || "",
          message
        });
      });
    });

    const dominantState =
      this.getDominantState(counts);

    const dominantEntry =
      entries.find(entry =>
        entry.mode === dominantState
      ) || null;

    return {
      agent,
      round,
      roundIndex,
      dominantState,
      counts,
      entries,
      message:
        dominantEntry?.message || null
    };
  },

  getDominantState(counts) {
    const priority = [
      "reacting",
      "rationalizing",
      "deliberating"
    ];

    const ranked =
      priority
        .map(state => ({
          state,
          count: counts[state] || 0
        }))
        .filter(item =>
          item.count > 0
        )
        .sort((a, b) =>
          b.count - a.count ||
          priority.indexOf(a.state) -
            priority.indexOf(b.state)
        );

    return ranked.length
      ? ranked[0].state
      : "none";
  },

  createCell(cellData) {
    const cell =
      document.createElement("button");

    cell.type =
      "button";
    cell.className =
      `internal-state-cell state-${cellData.dominantState}`;

    cell.setAttribute(
      "aria-label",
      `${this.shortAgentName(cellData.agent)}, Round ${cellData.roundIndex + 1}: ${this.stateLabels[cellData.dominantState]}`
    );

    cell.addEventListener(
      "mouseenter",
      event => {
        this.showTooltip(
          event,
          cellData
        );
      }
    );

    cell.addEventListener(
      "mousemove",
      event => {
        this.moveTooltip(event);
      }
    );

    cell.addEventListener(
      "mouseleave",
      () => {
        this.hideTooltip();
      }
    );

    cell.addEventListener(
      "click",
      () => {
        this.selectMessage(cellData);
      }
    );

    return cell;
  },

  selectMessage(cellData) {
    const app = window.VastApp;

    this.selectRound(
      cellData.roundIndex,
      false
    );

    if (!cellData.message) {
      return;
    }

    requestAnimationFrame(() => {
      const svg =
        app.elements.timeline
          ?.querySelector("svg");

      if (!svg) {
        return;
      }

      app.selection.select(
        cellData.message,
        svg
      );

      app.elements.timeline
        ?.scrollIntoView({
          behavior: "smooth",
          block: "nearest"
        });
    });
  },

  selectRound(
    roundIndex,
    scrollToTimeline = true
  ) {
    const app = window.VastApp;
    const round =
      window.VAST_DATA?.rounds?.[roundIndex];

    if (!round) {
      return;
    }

    app.state.roundIndex =
      roundIndex;
    app.state.selectedMessageId =
      null;
    app.state.replyTargets =
      new Map();

    if (app.elements.roundSelect) {
      app.elements.roundSelect.value =
        String(roundIndex);
    }

    app.details.render(null);
    app.app.renderRound();

    if (scrollToTimeline) {
      app.elements.timeline?.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
      });
    }
  },

  ensureTooltip() {
    let tooltip =
      document.querySelector(
        "#internalStateTooltip"
      );

    if (tooltip) {
      return tooltip;
    }

    tooltip =
      document.createElement("div");
    tooltip.id =
      "internalStateTooltip";
    tooltip.className =
      "internal-state-tooltip";
    tooltip.hidden =
      true;

    document.body.append(tooltip);
    return tooltip;
  },

  showTooltip(event, cellData) {
    const tooltip =
      this.ensureTooltip();

    const headline =
      cellData.round.environment_context
        ?.event_headline ||
      `Round ${cellData.roundIndex + 1}`;

    const entries =
      cellData.entries.length
        ? cellData.entries
            .map(entry => `
              <div class="internal-state-tooltip-entry">
                <strong>
                  ${this.escapeHtml(
                    this.stateLabels[entry.mode]
                  )}
                </strong>
                ${
                  entry.timestamp
                    ? `<span>${this.escapeHtml(
                        this.formatTimestamp(
                          entry.timestamp
                        )
                      )}</span>`
                    : ""
                }
                <p>${this.escapeHtml(entry.text)}</p>
              </div>
            `)
            .join("")
        : `
          <p class="internal-state-tooltip-empty">
            No internal state recorded.
          </p>
        `;

    tooltip.innerHTML = `
      <div class="internal-state-tooltip-title">
        ${this.escapeHtml(
          window.VastApp.agents.displayName(
            cellData.agent
          )
        )}
      </div>

      <div class="internal-state-tooltip-meta">
        Round ${cellData.roundIndex + 1}
      </div>

      <div class="internal-state-tooltip-headline">
        ${this.escapeHtml(headline)}
      </div>

      <div class="internal-state-tooltip-dominant">
        Dominant state:
        <strong>
          ${this.escapeHtml(
            this.stateLabels[
              cellData.dominantState
            ]
          )}
        </strong>
      </div>

      <div class="internal-state-tooltip-list">
        ${entries}
      </div>
    `;

    tooltip.hidden = false;
    this.moveTooltip(event);
  },

  moveTooltip(event) {
    const tooltip =
      this.ensureTooltip();
    const offset = 12;

    const left = Math.min(
      event.clientX + offset,
      window.innerWidth -
        tooltip.offsetWidth -
        8
    );

    const top = Math.min(
      event.clientY + offset,
      window.innerHeight -
        tooltip.offsetHeight -
        8
    );

    tooltip.style.left =
      `${Math.max(8, left)}px`;
    tooltip.style.top =
      `${Math.max(8, top)}px`;
  },

  hideTooltip() {
    const tooltip =
      document.querySelector(
        "#internalStateTooltip"
      );

    if (tooltip) {
      tooltip.hidden = true;
    }
  },

  formatTimestamp(value) {
    const date =
      new Date(value);

    if (
      Number.isNaN(date.getTime())
    ) {
      return value;
    }

    return new Intl.DateTimeFormat(
      "en",
      {
        hour: "2-digit",
        minute: "2-digit"
      }
    ).format(date);
  },

  escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  },

  shortAgentName(agent) {
    return window.VastApp.agents
      .displayName(agent)
      .replace(/-Agent$/i, "")
      .replace(/_/g, " ");
  }
};
