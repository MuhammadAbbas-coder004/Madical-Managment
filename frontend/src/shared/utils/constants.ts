export const ANIMATION = {
  EASING: {
    GSAP: 'power3.out',
    CSS: 'cubic-bezier(0.19, 1, 0.22, 1)',
  },
  FADE_UP: {
    Y_OFFSET: 12,
    DURATION: 0.4,
    STAGGER: 0.05,
  },
  LAYOUT: {
    INITIAL_Y: 8,
    INITIAL_DURATION: 0.4,
    ROUTE_DURATION: 0.3,
  },
  BADGE: {
    DANGER_SCALE: 1.04,
    DANGER_OPACITY: 0.85,
    PULSE_DURATION: 0.8,
  },
  SKELETON: {
    OPACITY_MIN: 0.5,
    OPACITY_MAX: 1,
    DURATION: 0.8,
  },
  SIDEBAR: {
    DURATION: 0.3,
  },
  ACTIVE_BAR: {
    DURATION: 0.3,
  },
} as const;
