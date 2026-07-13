window.VastApp = window.VastApp || {};

window.VastApp.timelineLayout = {
  create(agentCount) {
    const { CONFIG, elements } = window.VastApp;
    const width = Math.max(CONFIG.minimumTimelineWidth, elements.timeline.clientWidth || 900);
    const laneHeight = Math.max(
      CONFIG.layout.minimumLaneHeight,
      Math.floor(CONFIG.layout.totalLaneSpace / Math.max(agentCount, 1))
    );
    const height = CONFIG.layout.top + agentCount * laneHeight + CONFIG.layout.bottom;

    return {
      ...CONFIG.layout,
      width,
      height,
      laneHeight,
      plotEndX: width - CONFIG.layout.right
    };
  },

  lanePositions(agents, layout) {
    return new Map(agents.map((agent, index) => [
      agent.agent_id,
      layout.top + index * layout.laneHeight + layout.laneHeight / 2
    ]));
  },

  timeScale(start, end, minimumX, maximumX) {
    const startMs = start.getTime();
    const span = Math.max(1, end.getTime() - startMs);
    return date => minimumX + ((date.getTime() - startMs) / span) * (maximumX - minimumX);
  },

  timeTicks(start, end, count) {
    const step = (end.getTime() - start.getTime()) / Math.max(1, count - 1);
    return Array.from({ length: count }, (_, index) => new Date(start.getTime() + step * index));
  },

  messagePositions(messages, laneY, xScale) {
    return new Map(messages.map(message => [
      message.message_id,
      { x: xScale(new Date(message.timestamp)), y: laneY.get(message.agent_id) }
    ]));
  }
};
