export const affirmations = [
  "My thoughts are not reality. My actions shape reality.",
  "Perfection is illusion. Progress is real.",
  "I trust myself to handle whatever happens next.",
  "Every expert was once a beginner. Every master was once an amateur.",
  "The more you do it, the less scary it gets.",
  "A “failed” attempt is still progress because it means you tried.",
  "Courage isn’t the absence of fear — it’s acting despite it.",
  "Action precedes clarity. The doing comes first.",
  "Stop seeing it as failure, it’s calibration.",
  "If you need to solve a problem, act. Contemplating the complexity of the problem simply creates excess potential and feeds the pendulum your energy.",
  "When you take action, you realize the energy behind intention, and the hands do what the eyes fear to pursue.",
  "People assume successful people are some type of geniuses, but usually they fail their way to success.",
  "Analysis paralysis.",
  "Your brain naturally remembers failures — train it to remember wins too.",
  "Action beats perfection. Small steps build confidence.",
  "You don’t have to get it perfect. You just have to get it going.",
  "You don’t have to be great to start, but you have to start to be great. — Zig Ziglar",
  "Clarity comes from engagement, not thought.",
  "Action comes before mastery. Growth comes through action.",
  "Starting, even imperfectly, is what leads to progress.",
] as const;

export function pickAffirmation(): string {
  return affirmations[Math.floor(Math.random() * affirmations.length)];
}
