import type { GuideDefinition } from "@/lib/guides/types";

export const INVITE_TEAM_MEMBER_GUIDE: GuideDefinition = {
  id: "invite-team-member",
  title: "Invite a team member",
  summary: "Open Team, invite a colleague, choose a role, and send the invitation.",
  aiExplanation:
    "Invite someone from Team. I can walk you through sending a real invitation.",
  steps: [
    {
      id: "open-team",
      title: "Open Team",
      instruction: "Click Team in the sidebar.",
      target: "nav-team",
      completion: [{ kind: "pathname", prefix: "/team" }],
      wrongClick: "That's not part of this step. We're looking for Team in the sidebar.",
    },
    {
      id: "open-invite",
      title: "Invite a member",
      instruction: "Click Invite employee to open the invitation dialog.",
      target: "team-invite",
      completion: [{ kind: "element", target: "invite-dialog" }],
      wrongClick: "We're looking for \"Invite employee\".",
    },
    {
      id: "enter-email",
      title: "Enter an email",
      instruction: "Type the teammate's work email.",
      target: "invite-email",
      completion: [{ kind: "complete", target: "invite-email" }],
      wrongClick: "Enter the email in this field first.",
    },
    {
      id: "select-role",
      title: "Select a role",
      instruction: "Choose Mechanic (or another role this person should have).",
      target: "invite-role-mechanic",
      fallbackTarget: "invite-roles",
      completion: [{ kind: "signal", name: "invite-role-selected" }],
      hint: "Mechanic is the usual shop-floor role.",
      wrongClick: "Pick a role on this step — Mechanic is a good default.",
    },
    {
      id: "send-invite",
      title: "Send the invitation",
      instruction: 'Click "Send email" to create the invitation.',
      target: "invite-send",
      completion: [{ kind: "complete", target: "invite-sent" }],
      wrongClick: "Send the email invitation to finish this step.",
    },
  ],
};
