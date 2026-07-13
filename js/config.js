window.VastApp = window.VastApp || {};

window.VastApp.CONFIG = {
  messageRadius: 6,
  minimumTimelineWidth: 620,
  resizeDebounceMs: 120,
  axisTickCount: 6,
  layout: {
    left: 145,
    right: 24,
    top: 38,
    bottom: 22,
    totalLaneSpace: 248,
    minimumLaneHeight: 32
  },
  agentOrder: [
    "legal_agent",
    "quality_agent",
    "pr_agent",
    "social_media_agent",
    "pr_intern_agent",
    "intern_agent",
    "judge_agent"
  ]
};

window.VastApp.CHANNEL_STYLES = {
  comms_huddle: {
    label: "Broadcast",
    color: "#2d5bff"
  },

  one_on_one_chat: {
    label: "One-to-one",
    color: "#8a5cf6"
  },

  side_huddle: {
    label: "Side huddle",
    color: "#1f9d74"
  },

  official_post: {
    label: "Public post",
    color: "#ff9f1c"
  },

  personal_post: {
    label: "Personal post",
    color: "#ff5d8f"
  },

  anonymous_post: {
    label: "Anonymous post",
    color: "#ffd60a"
  },

  default: {
    label: "Other",
    color: "#667085"
  }
};

window.VastApp.LEGEND_CHANNELS = [
  "comms_huddle",
  "one_on_one_chat",
  "side_huddle",
  "official_post",
  "anonymous_post",
  "personal_post"
];
