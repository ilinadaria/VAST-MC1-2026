window.VastApp = window.VastApp || {};

window.VastApp.tooltip = {
  show(event, message) {
    const { escapeHtml, formatTime, truncate } = window.VastApp.utils;
    const tooltip = window.VastApp.elements.tooltip;

    tooltip.innerHTML = `
      <strong>${escapeHtml(message.agent_label || message.agent_id)} · ${formatTime(new Date(message.timestamp))}</strong>
      ${escapeHtml(truncate(message.content, 180))}
    `;
    tooltip.hidden = false;
    this.move(event);
  },

  move(event) {
    const tooltip = window.VastApp.elements.tooltip;
    tooltip.style.left = `${Math.min(event.clientX + 14, window.innerWidth - 350)}px`;
    tooltip.style.top = `${Math.min(event.clientY + 14, window.innerHeight - 140)}px`;
  },

  hide() {
    window.VastApp.elements.tooltip.hidden = true;
  }
};
