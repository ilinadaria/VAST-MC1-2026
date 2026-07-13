window.VastApp = window.VastApp || {};

window.VastApp.agents = {
  getAll(data) {
    const agentsById = new Map();

    data.rounds.forEach(round => {
      (round.participants || []).forEach(agent => {
        if (!agentsById.has(agent.agent_id)) agentsById.set(agent.agent_id, agent);
      });

      (round.communications || []).forEach(message => {
        if (!agentsById.has(message.agent_id)) {
          agentsById.set(message.agent_id, {
            agent_id: message.agent_id,
            agent_label: message.agent_label,
            agent_role: message.agent_role
          });
        }
      });
    });

    return this.sort([...agentsById.values()]);
  },

  sort(agents) {
    const order = window.VastApp.CONFIG.agentOrder;
    const ranks = new Map(order.map((id, index) => [id, index]));

    return agents.sort((a, b) => {
      const rankDifference = (ranks.get(a.agent_id) ?? 99) - (ranks.get(b.agent_id) ?? 99);
      if (rankDifference) return rankDifference;
      return this.displayName(a).localeCompare(this.displayName(b));
    });
  },

  displayName(agent) {
    return agent.agent_label || agent.agent_id;
  }
};
