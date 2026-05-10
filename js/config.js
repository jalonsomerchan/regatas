export const ASSETS = {
  player: [
    "assets/sprites/player8/idle-1.png",
    "assets/sprites/player8/idle-2.png",
    "assets/sprites/player8/idle-3.png",
    "assets/sprites/player8/idle-4.png"
  ],
  rivals: [
    "assets/sprites/rivals8/idle-1.png",
    "assets/sprites/rivals8/idle-2.png",
    "assets/sprites/rivals8/idle-3.png",
    "assets/sprites/rivals8/idle-4.png"
  ]
};

export const DIFFICULTY = {
  easy: { labelKey: "difficulty.easy", speed: 0.86, steering: 0.7, aggression: 0.08, mistakes: 0.34, boost: 0.78 },
  normal: { labelKey: "difficulty.normal", speed: 0.98, steering: 0.94, aggression: 0.18, mistakes: 0.18, boost: 0.96 },
  hard: { labelKey: "difficulty.hard", speed: 1.08, steering: 1.14, aggression: 0.3, mistakes: 0.08, boost: 1.12 }
};

export const COURSES = {
  river: { labelKey: "course.river", length: 7600, laps: 1 },
  sea: { labelKey: "course.sea", length: 3600, laps: 3 },
  slalom: { labelKey: "course.slalom", length: 6400, laps: 1 }
};
