window.VastApp = window.VastApp || {};

window.VastApp.overallActivity = {
  render() {
    const app = window.VastApp;
    const chartsTarget =
      document.querySelector("#overallActivityCharts");
    if (!chartsTarget) {
      console.error(
        "Overall activity chart target not found."
      );
      return;
    }

    const rounds =
      window.VAST_DATA?.rounds || [];

    const agents =
      app.agents.getAll(window.VAST_DATA);

    const channels =
      app.LEGEND_CHANNELS.filter(channel =>
        rounds.some(round =>
          (round.communications || []).some(
            message =>
              message.message_type !== "action" &&
              message.channel === channel
          )
        )
      );

    const chartData =
      this.buildChartData(
        rounds,
        agents,
        channels
      );

    const globalMaximum = Math.max(
      1,
      ...chartData.flatMap(item =>
        item.rounds.map(round => round.total)
      )
    );


    chartsTarget.replaceChildren(
      ...chartData.map(item =>
        this.createAgentCard(
          item,
          channels,
          globalMaximum
        )
      )
    );

    this.ensureTooltip();
  },

  buildChartData(
    rounds,
    agents,
    channels
  ) {
    return agents.map(agent => {
      const roundData = rounds.map(
        (round, roundIndex) => {
          const messages =
            (round.communications || [])
              .filter(message =>
                message.message_type !== "action" &&
                message.agent_id === agent.agent_id
              );

          const byChannel = {};

          channels.forEach(channel => {
            byChannel[channel] =
              messages.filter(message =>
                message.channel === channel
              ).length;
          });

          return {
            index: roundIndex,
            label: `R${roundIndex + 1}`,
            fullLabel: `Round ${roundIndex + 1}`,
            total: messages.length,
            byChannel
          };
        }
      );

      return {
        agent,
        total: roundData.reduce(
          (sum, round) => sum + round.total,
          0
        ),
        rounds: roundData
      };
    });
  },

  createAgentCard(
    item,
    channels,
    globalMaximum
  ) {
    const card =
      document.createElement("section");
    const heading =
      document.createElement("div");
    const name =
      document.createElement("strong");
    const total =
      document.createElement("span");
    const chart =
      document.createElement("div");

    card.className =
      "overall-agent-card";
    heading.className =
      "overall-agent-card-heading";
    chart.className =
      "overall-agent-chart";
    chart.style.gridTemplateColumns =
      `repeat(${Math.max(1, item.rounds.length)}, minmax(0, 1fr))`;


    name.textContent =
      this.shortAgentName(item.agent);

    total.textContent =
      `${item.total} total`;

    heading.append(name, total);

    item.rounds.forEach(round => {
      chart.append(
        this.createRoundColumn(
          round,
          channels,
          globalMaximum
        )
      );
    });

    card.append(heading, chart);
    return card;
  },

  createRoundColumn(
    round,
    channels,
    globalMaximum
  ) {
    const app = window.VastApp;
    const column =
      document.createElement("div");
    const barArea =
      document.createElement("div");
    const stack =
      document.createElement("div");
    const totalLabel =
      document.createElement("span");
    const roundLabel =
      document.createElement("span");

    column.className =
      round.index === 21
        ? "overall-round-column embargo-round"
        : "overall-round-column";
    column.tabIndex = 0;
    column.dataset.roundIndex = String(round.index);
    column.setAttribute("role", "button");
    column.setAttribute(
      "aria-label",
      `Show ${round.fullLabel} on the timeline`
    );

    column.addEventListener(
      "click",
      () => this.selectRound(round.index)
    );

    column.addEventListener(
      "keydown",
      event => {
        if (
          event.key !== "Enter" &&
          event.key !== " "
        ) {
          return;
        }

        event.preventDefault();
        this.selectRound(round.index);
      }
    );

    barArea.className =
      "overall-bar-area";
    stack.className =
      "overall-stacked-bar";
    totalLabel.className =
      "overall-bar-total";
    roundLabel.className =
      "overall-round-label";

    totalLabel.textContent =
      round.total ? String(round.total) : "";

    const height =
      (round.total / globalMaximum) * 100;

    stack.style.height =
      `${height}%`;

    channels.forEach(channel => {
      const count =
        round.byChannel[channel] || 0;

      if (!count || !round.total) {
        return;
      }

      const segment =
        document.createElement("span");
      const style =
        app.dataHelpers.getChannelStyle(channel);

      segment.className =
        "overall-bar-segment";
      segment.style.height =
        `${(count / round.total) * 100}%`;
      segment.style.background =
        style.color;

      segment.addEventListener(
        "mouseenter",
        event => {
          this.showTooltip(
            event,
            style.label,
            count,
            round.fullLabel
          );
        }
      );

      segment.addEventListener(
        "mousemove",
        event => {
          this.moveTooltip(event);
        }
      );

      segment.addEventListener(
        "mouseleave",
        () => {
          this.hideTooltip();
        }
      );

      stack.append(segment);
    });

    roundLabel.textContent =
      round.label;
    roundLabel.title =
      round.fullLabel;

    stack.append(totalLabel);
    barArea.append(stack);
    column.append(
      barArea,
      roundLabel
    );

    return column;
  },


  selectRound(roundIndex) {
    window.VastApp.roundSelection.select(
      roundIndex,
      { scrollToTimeline: true }
    );
  },

  updateSelection(roundIndex) {
    document
      .querySelectorAll(
        "#overallActivityCharts .overall-round-column"
      )
      .forEach(column => {
        column.classList.toggle(
          "selected-round",
          roundIndex !== null &&
          Number(column.dataset.roundIndex) === roundIndex
        );
      });
  },

  ensureTooltip() {
    let tooltip =
      document.querySelector(
        "#overallActivityTooltip"
      );

    if (tooltip) {
      return tooltip;
    }

    tooltip =
      document.createElement("div");
    tooltip.id =
      "overallActivityTooltip";
    tooltip.className =
      "overall-activity-tooltip";
    tooltip.hidden = true;

    document.body.append(tooltip);
    return tooltip;
  },

  showTooltip(
    event,
    channelLabel,
    count,
    roundLabel
  ) {
    const tooltip =
      this.ensureTooltip();

    tooltip.innerHTML = `
      <strong>${this.escapeHtml(channelLabel)}</strong>
      <span>${this.escapeHtml(roundLabel)}</span>
      <b>${count} message${count === 1 ? "" : "s"}</b>
    `;

    tooltip.hidden = false;
    this.moveTooltip(event);
  },

  moveTooltip(event) {
    const tooltip =
      this.ensureTooltip();

    const offset = 12;
    const width =
      tooltip.offsetWidth;
    const height =
      tooltip.offsetHeight;

    const left = Math.min(
      event.clientX + offset,
      window.innerWidth - width - 8
    );

    const top = Math.min(
      event.clientY + offset,
      window.innerHeight - height - 8
    );

    tooltip.style.left =
      `${Math.max(8, left)}px`;
    tooltip.style.top =
      `${Math.max(8, top)}px`;
  },

  hideTooltip() {
    const tooltip =
      document.querySelector(
        "#overallActivityTooltip"
      );

    if (tooltip) {
      tooltip.hidden = true;
    }
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
