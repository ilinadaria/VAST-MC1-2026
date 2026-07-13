window.VastApp = window.VastApp || {};

window.VastApp.dataHelpers = {
  getReplyValue(message) {
    return message.responding_to ?? message.replying_to ?? null;
  },

  getChannelStyle(channel) {
    const styles = window.VastApp.CHANNEL_STYLES;
    return styles[channel] || styles.default;
  },

  getTimeExtent(messages) {
    if (!messages.length) {
      const now = Date.now();
      return { start: new Date(now - 60000), end: new Date(now + 60000) };
    }

    const times = messages.map(message => new Date(message.timestamp).getTime());
    const start = Math.min(...times);
    const end = Math.max(...times);

    if (start === end) {
      return { start: new Date(start - 60000), end: new Date(end + 60000) };
    }

    return { start: new Date(start), end: new Date(end) };
  },

  formatRoundLabel(round, index) {
    const { formatDate } = window.VastApp.utils;
    const headline = round.environment_context?.event_headline || "Untitled round";
    return "Round " + (index + 1) + " | " + formatDate(new Date(round.hour)) + " - " + headline;
  },

  normalizeAgentName(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/agent/g, "")
      .replace(/[^a-z0-9]/g, "");
  }
};
