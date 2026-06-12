export const builtInTemplates = [
  {
    slug: "marketplace",
    name: "Marketplace Server",
    category: "trading",
    description: "Buying, selling, vouches, dispute handling, anti-scam reporting, and staff operations.",
    hints: {
      roles: ["Owner", "Admin", "Moderator", "Verified Seller", "Trusted Seller", "Middleman", "Buyer", "Member"],
      categories: ["Start Here", "Marketplace", "Trust & Safety", "Community", "Staff"],
      channels: [
        "rules",
        "verification",
        "announcements",
        "buy-accounts",
        "sell-accounts",
        "vouches",
        "middleman-requests",
        "report-scammer",
        "disputes",
        "general-chat",
        "staff-chat",
        "mod-logs"
      ]
    }
  },
  {
    slug: "gaming-clan",
    name: "Gaming Clan",
    category: "gaming",
    description: "Clan onboarding, squads, events, voice rooms, recruitment, and staff coordination.",
    hints: {
      roles: ["Owner", "Admin", "Officer", "Moderator", "Recruiter", "Member", "Guest"],
      categories: ["Start Here", "Clan HQ", "Squads", "Events", "Voice", "Staff"],
      channels: ["rules", "announcements", "recruitment", "general", "wins", "event-planning", "staff-chat"]
    }
  },
  {
    slug: "education",
    name: "Education Community",
    category: "education",
    description: "Structured study channels, resources, mentoring, events, moderation, and announcements.",
    hints: {
      roles: ["Owner", "Admin", "Moderator", "Mentor", "Student", "Alumni"],
      categories: ["Start Here", "Study", "Resources", "Events", "Support", "Staff"],
      channels: ["rules", "verification", "announcements", "questions", "resources", "study-room", "mentor-help", "staff-chat"]
    }
  }
];

export function selectTemplateHints(goal: string) {
  const normalized = goal.toLowerCase();
  if (/(market|buy|sell|trade|account|vouch|middleman|scam)/.test(normalized)) return builtInTemplates[0];
  if (/(game|clan|guild|rok|rise of kingdoms|squad)/.test(normalized)) return builtInTemplates[1];
  if (/(study|education|ssb|exam|school|college|course)/.test(normalized)) return builtInTemplates[2];
  return builtInTemplates[0];
}
