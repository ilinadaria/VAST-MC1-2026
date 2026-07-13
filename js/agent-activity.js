window.VastApp = window.VastApp || {};

window.VastApp.agentActivity = {
  render(roundIndex) {
    const app = window.VastApp;
    const volumeTarget = document.querySelector("#agentVolumeChart");
    const channelTarget = document.querySelector("#agentChannelChart");

    if (!volumeTarget || !channelTarget) {
      console.error(
        "Agent activity chart targets not found. Expected #agentVolumeChart and #agentChannelChart."
      );
      return;
    }

    const round = window.VAST_DATA?.rounds?.[roundIndex];

    if (!round) {
      volumeTarget.textContent = "No activity data available.";
      channelTarget.replaceChildren();
      return;
    }

    const agents = app.agents.getAll(window.VAST_DATA);
    const messages = round.communications || [];

    volumeTarget.replaceChildren(
      this.createVolumeChart(messages, agents)
    );

    channelTarget.replaceChildren(
      this.createChannelChart(messages, agents)
    );
  },

  createVolumeChart(messages, agents) {
    const counts = this.countByAgent(messages, agents);

    return this.createHorizontalBarChart({
      title: "Messages by agent",
      rows: counts
    });
  },

  createChannelChart(messages, agents) {
    const channels = window.VastApp.LEGEND_CHANNELS.filter(channel =>
      messages.some(message => message.channel === channel)
    );

    const section = document.createElement("section");
    const title = document.createElement("h3");
    const rows = document.createElement("div");
    const legend = document.createElement("div");

    section.className = "agent-chart";
    title.className = "agent-chart-title";
    title.textContent = "Channel activity by agent";
    rows.className = "agent-channel-rows";
    legend.className = "agent-channel-legend";

    channels.forEach(channel => {
      const style = window.VastApp.dataHelpers.getChannelStyle(channel);
      const item = document.createElement("span");
      const swatch = document.createElement("span");

      item.className = "agent-channel-legend-item";
      swatch.className = "agent-channel-swatch";
      swatch.style.background = style.color;

      item.append(swatch, document.createTextNode(style.label));
      legend.append(item);
    });

    agents.forEach(agent => {
      const agentMessages = messages.filter(
        message => message.agent_id === agent.agent_id
      );
      const total = agentMessages.length;
      const row = document.createElement("div");
      const label = document.createElement("span");
      const track = document.createElement("div");
      const value = document.createElement("span");

      row.className = "agent-channel-row";
      label.className = "agent-chart-label";
      label.textContent = this.shortAgentName(agent);
      track.className = "agent-channel-track";
      value.className = "agent-chart-value";
      value.textContent = String(total);

      channels.forEach(channel => {
        const count = agentMessages.filter(
          message => message.channel === channel
        ).length;

        if (!count || !total) return;

        const segment = document.createElement("span");
        const style = window.VastApp.dataHelpers.getChannelStyle(channel);

        segment.className = "agent-channel-segment";
        segment.style.width = `${(count / total) * 100}%`;
        segment.style.background = style.color;
        segment.title = `${style.label}: ${count}`;
        track.append(segment);
      });

      row.append(label, track, value);
      rows.append(row);
    });

    section.append(title, rows);

    if (channels.length) {
      section.append(legend);
    }
    return section;
  },

  countByAgent(messages, agents) {
    const totals = new Map(
      agents.map(agent => [agent.agent_id, 0])
    );

    messages.forEach(message => {
      totals.set(
        message.agent_id,
        (totals.get(message.agent_id) || 0) + 1
      );
    });

    return agents.map(agent => ({
      label: this.shortAgentName(agent),
      value: totals.get(agent.agent_id) || 0
    }));
  },

  createHorizontalBarChart({ title, rows }) {
    const section = document.createElement("section");
    const heading = document.createElement("h3");
    const list = document.createElement("div");
    const maximum = Math.max(1, ...rows.map(row => row.value));

    section.className = "agent-chart";
    heading.className = "agent-chart-title";
    heading.textContent = title;
    list.className = "agent-chart-rows";

    rows.forEach(rowData => {
      const row = document.createElement("div");
      const label = document.createElement("span");
      const track = document.createElement("div");
      const bar = document.createElement("div");
      const value = document.createElement("span");

      row.className = "agent-chart-row";
      label.className = "agent-chart-label";
      label.textContent = rowData.label;
      track.className = "agent-chart-track";
      bar.className = "agent-chart-bar";
      bar.style.width = `${(rowData.value / maximum) * 100}%`;
      value.className = "agent-chart-value";
      value.textContent = String(rowData.value);

      track.append(bar);
      row.append(label, track, value);
      list.append(row);
    });

    section.append(heading, list);
    return section;
  },

  shortAgentName(agent) {
    return window.VastApp.agents
      .displayName(agent)
      .replace(/-Agent$/i, "")
      .replace(/_/g, " ");
  }
};
