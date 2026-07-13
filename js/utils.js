window.VastApp = window.VastApp || {};

window.VastApp.utils = {
  createSvg(tag, attributes = {}) {
    const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
    Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
    return node;
  },

  debounce(callback, wait) {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => callback(...args), wait);
    };
  },

  formatDate(date) {
    return new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  },

  formatTime(date) {
    return new Intl.DateTimeFormat("en", {
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  },

  humanize(text) {
    return String(text)
      .replaceAll("_", " ")
      .replace(/\b\w/g, character => character.toUpperCase());
  },

  truncate(text, length) {
    if (!text || text.length <= length) return text || "";
    return `${text.slice(0, length - 1)}…`;
  },

  escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
};
