window.VastApp = window.VastApp || {};

window.VastApp.timelineRenderer = {
  agentDescriptions: {
    legal_agent:
      "General legal counsel.",
    quality_agent:
      "VP of Platform Trust & Safety.",
    social_manager_agent:
      "Manages social messaging.",
    social_media_agent:
      "Manages social messaging.",
    pr_agent:
      "Head of Communications and Public Relations.",
    intern_agent:
      "General intern.",
    pr_intern_agent:
      "PR team intern with access to the official TenantThread Flex account.",
    judge_eval_agent:
      "Evaluates risks, mediates conflicts, and provides compliance guidance.",
    judge_agent:
      "Evaluates risks, mediates conflicts, and provides compliance guidance."
  },

  getAgentDescription(agent) {
    return (
      this.agentDescriptions[agent.agent_id] ||
      agent.description ||
      agent.agent_role ||
      "No agent description available."
    );
  },


  normalizeAgentName(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/-agent$/i, "")
      .replace(/agent/g, "")
      .replace(/[^a-z0-9]/g, "");
  },

  getUnavailableAgentIds(round, agents) {
    const unavailable =
      round.environment_context
        ?.agents_unavailable || [];

    const unavailableNames =
      new Set(
        unavailable.map(value =>
          this.normalizeAgentName(value)
        )
      );

    return new Set(
      agents
        .filter(agent => {
          const aliases = [
            agent.agent_id,
            agent.agent_label,
            agent.agent_role
          ]
            .filter(Boolean)
            .map(value =>
              this.normalizeAgentName(value)
            );

          return aliases.some(alias =>
            unavailableNames.has(alias)
          );
        })
        .map(agent => agent.agent_id)
    );
  },

  render(round) {
    const app = window.VastApp;
    const messages = [...(round.communications || [])]
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const agents = app.agents.getAll(window.VAST_DATA);
    const layout = app.timelineLayout.create(agents.length);
    const extent = app.dataHelpers.getTimeExtent(messages);
    const xScale = app.timelineLayout.timeScale(extent.start, extent.end, layout.left, layout.plotEndX);
    const laneY = app.timelineLayout.lanePositions(agents, layout);
    const positions = app.timelineLayout.messagePositions(messages, laneY, xScale);
    const unavailableAgentIds =
      this.getUnavailableAgentIds(
        round,
        agents
      );

    app.state.replyTargets = app.replies.resolve(messages);

    const svg = app.utils.createSvg("svg", {
      width: "100%",
      height: layout.height,
      viewBox: `0 0 ${layout.width} ${layout.height}`,
      preserveAspectRatio: "none"
    });

    this.drawAxis(svg, extent, xScale, layout);
    this.drawLanes(
      svg,
      agents,
      laneY,
      layout,
      unavailableAgentIds
    );
    this.drawLinks(svg, messages, positions);
    this.drawMessages(svg, messages, positions);
    this.bindBackground(svg);

    app.elements.timeline.replaceChildren(svg);
    app.messageSearch?.afterTimelineRender();
  },

  drawAxis(svg, extent, xScale, layout) {
    const app = window.VastApp;
    const ticks = app.timelineLayout.timeTicks(extent.start, extent.end, app.CONFIG.axisTickCount);

    ticks.forEach(date => {
      const x = xScale(date);
      svg.append(app.utils.createSvg("line", {
        x1: x,
        y1: layout.top - 16,
        x2: x,
        y2: layout.height - layout.bottom,
        class: "axis-line",
        opacity: 0.35
      }));

      const label = app.utils.createSvg("text", {
        x,
        y: 18,
        "text-anchor": "middle",
        class: "time-label"
      });
      label.textContent = app.utils.formatTime(date);
      svg.append(label);
    });
  },

  drawLanes(
    svg,
    agents,
    laneY,
    layout,
    unavailableAgentIds = new Set()
  ) {
    const { utils } = window.VastApp;

    agents.forEach(agent => {
      const y =
        laneY.get(agent.agent_id);

      const unavailable =
        unavailableAgentIds.has(
          agent.agent_id
        );

      const lane = utils.createSvg(
        "line",
        {
          x1: layout.left,
          y1: y,
          x2: layout.plotEndX,
          y2: y,
          class:
            unavailable
              ? "lane-line inactive-agent-lane"
              : "lane-line",
          "data-agent-id":
            agent.agent_id
        }
      );

      if (unavailable) {
        lane.setAttribute(
          "stroke-dasharray",
          "5 4"
        );
      }

      svg.append(lane);

      const label = utils.createSvg(
        "text",
        {
          x: layout.left - 14,
          y: y + 4,
          "text-anchor": "end",
          class:
            unavailable
              ? "lane-label inactive-agent-label"
              : "lane-label"
        }
      );

      label.textContent =
        agent.agent_label ||
        agent.agent_id;

      const title =
        utils.createSvg("title");

      title.textContent =
        this.getAgentDescription(agent) +
        (
          unavailable
            ? " Unavailable in this round."
            : ""
        );

      label.append(title);
      svg.append(label);
    });
  },

  drawLinks(svg, messages, positions) {
    const app = window.VastApp;
    const layer = app.utils.createSvg("g", { class: "links" });

    messages.forEach(message => {
      const target = positions.get(message.message_id);
      if (!target) return;

      (app.state.replyTargets.get(message.message_id) || []).forEach(({ messageId }) => {
        const source = positions.get(messageId);
        if (!source) return;

        const curve = Math.max(20, Math.abs(target.x - source.x) * 0.25);
        const path = `M ${source.x} ${source.y} C ${source.x + curve} ${source.y}, ${target.x - curve} ${target.y}, ${target.x} ${target.y}`;

        layer.append(app.utils.createSvg("path", {
          d: path,
          class: "reply-link",
          "data-source": messageId,
          "data-target": message.message_id
        }));
      });
    });

    svg.append(layer);
  },

  drawMessages(svg, messages, positions) {
    const app = window.VastApp;

    const layer = app.utils.createSvg(
      "g",
      { class: "messages" }
    );

    const filterSelect =
      document.getElementById("messageFilter");

    const filterMode =
      filterSelect?.value || "";
    
    const selectionFilterEnabled =
      filterMode === "tfidf-round" ||
      filterMode === "tfidf-global" ||
      filterMode === "llm";

    const importantIds =
      app.messageImportance.getImportantIds(
        app.state.roundIndex,
        filterMode
      );

    messages.forEach(message => {
      const position =
        positions.get(message.message_id);

      if (!position) {
        return;
      }

    const isImportant =
      importantIds.has(message.message_id);

    const classes = ["message-dot"];

    if (selectionFilterEnabled) {
      if (isImportant) {
        classes.push("tfidf-important");
      } 
      else {
          classes.push("tfidf-dimmed");
        }
      }

    const radius = app.CONFIG.messageRadius;
    const state =
      this.getMessageInternalState(message);

    const node = app.utils.createSvg(
      "g",
      {
        class: "message-node",
        "data-message-id": message.message_id,
        "data-agent-id": message.agent_id
      }
    );

    if (state) {
      const ring = app.utils.createSvg(
        "circle",
        {
          cx: position.x,
          cy: position.y,
          r: radius + 3.5,
          class:
            `message-state-ring state-ring-${state}`,
          "aria-hidden": "true"
        }
      );

      node.append(ring);
    }

    const dot = app.utils.createSvg(
      "circle",
      {
        cx: position.x,
        cy: position.y,
        r: radius,
        fill: app.dataHelpers
          .getChannelStyle(message.channel)
          .color,
        class: classes.join(" "),
        tabindex: 0,
        role: "button",
        "aria-label":
          (message.agent_label ||
            message.agent_id) +
          ", " +
          app.utils.formatTime(
            new Date(message.timestamp)
          ) +
          ": " +
          message.content,
        "data-message-id":
          message.message_id,
        "data-agent-id":
          message.agent_id
      }
    );

    this.bindDot(dot, message, svg);
    node.append(dot);
    layer.append(node);
    });

    svg.append(layer);
},

  getMessageInternalState(message) {
    const state =
      message.internal_state;

    if (
      !state ||
      typeof state !== "object"
    ) {
      return null;
    }

    const priority = [
      "reacting",
      "rationalizing",
      "deliberating"
    ];

    return priority.find(mode => {
      const value =
        state[mode];

      return (
        value !== null &&
        value !== undefined &&
        value !== ""
      );
    }) || null;
  },

  bindDot(dot, message, svg) {
    const app = window.VastApp;
    dot.addEventListener("mouseenter", event => app.tooltip.show(event, message));
    dot.addEventListener("mousemove", event => app.tooltip.move(event));
    dot.addEventListener("mouseleave", () => app.tooltip.hide());
    dot.addEventListener("click", event => {
      event.stopPropagation();
      app.selection.select(message, svg);
    });
    dot.addEventListener("keydown", event => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      app.selection.select(message, svg);
    });
  },

  bindBackground(svg) {
    svg.addEventListener("click", event => {
      if (!event.target.closest(".message-node")) {
        window.VastApp.selection.clear(svg);
      }
    });
  }
};
