export type Priority = "Urgent" | "Medium" | "Normal" | "Low";

export type User = {
  src: string;
  name: string;
  email: string;
  status: "Online" | "Offline";
  isAdmin: boolean;
  role: string;
  boardCount: number;
};

export type Comment = {
  id: number;
  author: User;
  createdAt: string;
  body: string;
};

export type Card = {
  id: number;
  title: string;
  priority: Priority;
  due?: string;
  tag: string;
  assignee: User;
  description?: string;
  comments?: Comment[];
};

export type Column = {
  id: string;
  title: string;
  wip?: number;
  cards: Card[];
};

export type Swimlane = {
  id: string;
  title: string;
  columns: Column[];
};

export type Board = {
  id: string;
  title: string;
  swimlanes: Swimlane[];
  memberCount: number;
};

export const users: User[] = [
  {
    src: "/avatars/avatar-1.jpg",
    name: "Alex Morgan",
    email: "alex@focusnode.io",
    status: "Online",
    isAdmin: true,
    role: "Engineer",
    boardCount: 6,
  },
  {
    src: "/avatars/avatar-2.jpg",
    name: "Pamela Smith",
    email: "pamela@focusnode.io",
    status: "Offline",
    isAdmin: false,
    role: "Product Owner",
    boardCount: 4,
  },
  {
    src: "/avatars/avatar-3.jpg",
    name: "Anna Williams",
    email: "anna@focusnode.io",
    status: "Offline",
    isAdmin: true,
    role: "Designer",
    boardCount: 3,
  },
];

export const boards: Board[] = [
  {
    id: "product-launch-q2",
    title: "Product Launch Q2",
    memberCount: 3,
    swimlanes: [
      {
        id: "engineering",
        title: "Engineering",
        columns: [
          {
            id: "backlog",
            title: "Backlog",
            cards: [
              {
                id: 101,
                title: "Update API documentation v2.3",
                priority: "Urgent",
                due: "3/17",
                tag: "Docs",
                assignee: users[0],
                description:
                  "Refresh the #api reference and loop in @alex for the #v2 request examples before the #release cut.",
                comments: [
                  {
                    id: 1,
                    author: users[1],
                    createdAt: "2026-06-21T08:30:00Z",
                    body: "Bumped to **Urgent** — the `/v2/tokens` refresh path is the current blocker.",
                  },
                  {
                    id: 2,
                    author: users[2],
                    createdAt: "2026-06-20T17:00:00Z",
                    body: "Full spec: https://docs.focusnode.io/internal/api/v2/authentication/refresh-token-rotation-and-revocation-policy",
                  },
                  {
                    id: 3,
                    author: users[0],
                    createdAt: "2026-06-19T09:00:00Z",
                    body: "Repro on staging:\n\n```\nPOST /v2/tokens\nAuthorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJyZWZyZXNoLTAxOTIiLCJzY29wZSI6InRva2VuOnJvdGF0ZSJ9.sig-9f2c1a7b\n→ 401 token_expired\n```",
                  },
                ],
              },
              {
                id: 102,
                title: "Design onboarding flow revamp",
                priority: "Normal",
                due: "3/23",
                tag: "Design",
                assignee: users[2],
                description:
                  "Pair with @anna on the #onboarding flow and capture #ux notes for @sam to review.",
              },
              {
                id: 103,
                title: "Research competitor pricing models",
                priority: "Low",
                tag: "Research",
                assignee: users[1],
              },
              {
                id: 104,
                title: "Set up feature flag service",
                priority: "Medium",
                due: "3/25",
                tag: "Engineering",
                assignee: users[1],
              },
              {
                id: 105,
                title: "Define analytics event schema",
                priority: "Normal",
                tag: "Docs",
                assignee: users[2],
              },
              {
                id: 106,
                title: "Spike: offline sync strategy",
                priority: "Low",
                due: "3/28",
                tag: "Engineering",
                assignee: users[0],
              },
            ],
          },
          {
            id: "todo",
            title: "To Do",
            wip: 5,
            cards: [
              {
                id: 201,
                title: "Implement auth token refresh logic",
                priority: "Normal",
                due: "3/19",
                tag: "Engineering",
                assignee: users[0],
              },
              {
                id: 202,
                title: "Write unit tests for payment module",
                priority: "Normal",
                due: "3/18",
                tag: "Engineering",
                assignee: users[0],
              },
              {
                id: 203,
                title: "Add rate limiting to API gateway",
                priority: "Medium",
                due: "3/20",
                tag: "Engineering",
                assignee: users[1],
              },
              {
                id: 204,
                title: "Refactor settings page state",
                priority: "Low",
                tag: "Engineering",
                assignee: users[2],
              },
            ],
          },
          {
            id: "in-progress",
            title: "In Progress",
            wip: 3,
            cards: [
              {
                id: 301,
                title: "Build notification preferences panel",
                priority: "Urgent",
                due: "3/16",
                tag: "Engineering",
                assignee: users[0],
              },
              {
                id: 302,
                title: "Create dashboard analytics widgets",
                priority: "Medium",
                due: "3/17",
                tag: "Design",
                assignee: users[2],
              },
              {
                id: 303,
                title: "Wire up onboarding checklist",
                priority: "Normal",
                due: "3/19",
                tag: "Design",
                assignee: users[1],
              },
            ],
          },
          {
            id: "in-review",
            title: "In Review",
            wip: 2,
            cards: [
              {
                id: 401,
                title: "Migrate database to new schema",
                priority: "Normal",
                due: "3/18",
                tag: "Engineering",
                assignee: users[0],
              },
              {
                id: 402,
                title: "Review PR #318 — caching layer",
                priority: "Medium",
                due: "3/18",
                tag: "Engineering",
                assignee: users[2],
              },
            ],
          },
          {
            id: "done",
            title: "Done",
            cards: [
              {
                id: 501,
                title: "Set up CI/CD pipeline for staging",
                priority: "Low",
                tag: "Engineering",
                assignee: users[0],
              },
              {
                id: 502,
                title: "Logo & brand guideline finalization",
                priority: "Low",
                tag: "Design",
                assignee: users[2],
              },
            ],
          },
          {
            id: "archived",
            title: "Archived",
            cards: [
              {
                id: 501,
                title: "User research and feedback",
                priority: "Low",
                tag: "Research",
                assignee: users[0],
              },
              {
                id: 502,
                title: "Branding",
                priority: "Low",
                tag: "Design",
                assignee: users[2],
              },
            ],
          },
          {
            id: "blocked",
            title: "Blocked",
            cards: [],
          },
        ],
      },
      {
        id: "design",
        title: "Design",
        columns: [
          {
            id: "todo",
            title: "To Do",
            cards: [
              {
                id: 1001,
                title: "Audit current marketing site IA",
                priority: "Medium",
                due: "3/21",
                tag: "Research",
                assignee: users[2],
              },
              {
                id: 1002,
                title: "Define new visual language tokens",
                priority: "Normal",
                due: "3/24",
                tag: "Design",
                assignee: users[2],
              },
              {
                id: 1003,
                title: "Homepage hero exploration",
                priority: "Urgent",
                due: "3/18",
                tag: "Design",
                assignee: users[1],
              },
            ],
          },
          {
            id: "in-progress",
            title: "In Progress",
            wip: 2,
            cards: [],
          },
          {
            id: "done",
            title: "Done",
            cards: [
              {
                id: 1002,
                title: "Define new visual language tokens",
                priority: "Normal",
                due: "3/24",
                tag: "Design",
                assignee: users[2],
              },
            ],
          },
        ],
      },
      {
        id: "marketing",
        title: "Marketing",
        columns: [
          {
            id: "todo",
            title: "To Do",
            cards: [
              {
                id: 1001,
                title: "Audit current marketing site IA",
                priority: "Medium",
                due: "3/21",
                tag: "Research",
                assignee: users[2],
              },
            ],
          },
          {
            id: "in-progress",
            title: "In Progress",
            wip: 2,
            cards: [
              {
                id: 1002,
                title: "Marketing campaign launch",
                priority: "Urgent",
                due: "3/24",
                tag: "Marketing",
                assignee: users[2],
              },
              {
                id: 1004,
                title: "Market Research",
                priority: "Low",
                due: "3/26",
                tag: "Research",
                assignee: users[2],
              },
            ],
          },
          {
            id: "done",
            title: "Done",
            cards: [
              {
                id: 1003,
                title: "Product launch email campaign",
                priority: "Normal",
                due: "3/25",
                tag: "Marketing",
                assignee: users[2],
              },
            ],
          },
          {
            id: "archived",
            title: "Archived",
            cards: [
              {
                id: 1004,
                title: "Market Research",
                priority: "Low",
                due: "3/26",
                tag: "Research",
                assignee: users[2],
              },
            ],
          },
          {
            id: "blocked",
            title: "Blocked",
            cards: [
              {
                id: 1005,
                title: "Social media campaign launch",
                priority: "Urgent",
                due: "3/27",
                tag: "Social Media",
                assignee: users[2],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "website-redesign",
    title: "Website Redesign",
    memberCount: 4,
    swimlanes: [
      {
        id: "design",
        title: "Design",
        columns: [
          {
            id: "todo",
            title: "To Do",
            cards: [
              {
                id: 1001,
                title: "Audit current marketing site IA",
                priority: "Medium",
                due: "3/21",
                tag: "Research",
                assignee: users[2],
              },
              {
                id: 1002,
                title: "Define new visual language tokens",
                priority: "Normal",
                due: "3/24",
                tag: "Design",
                assignee: users[2],
              },
            ],
          },
          {
            id: "in-progress",
            title: "In Progress",
            wip: 1,
            cards: [
              {
                id: 1003,
                title: "Homepage hero exploration",
                priority: "Urgent",
                due: "3/18",
                tag: "Design",
                assignee: users[1],
              },
            ],
          },
          { id: "done", title: "Done", cards: [] },
        ],
      },
      { id: "engineering", title: "Engineering", columns: [] },
    ],
  },
  {
    id: "mobile-app-upgrade",
    title: "Mobile App Upgrade",
    memberCount: 5,
    swimlanes: [
      {
        id: "engineering",
        title: "Engineering",
        columns: [
          {
            id: "backlog",
            title: "Backlog",
            cards: [
              {
                id: 2001,
                title: "Upgrade React Native to 0.74",
                priority: "Medium",
                tag: "Engineering",
                assignee: users[0],
              },
              {
                id: 2002,
                title: "Replace deprecated AsyncStorage usage",
                priority: "Low",
                tag: "Engineering",
                assignee: users[0],
              },
            ],
          },
          {
            id: "in-progress",
            title: "In Progress",
            wip: 1,
            cards: [
              {
                id: 2003,
                title: "Biometric login flow",
                priority: "Urgent",
                due: "3/15",
                tag: "Engineering",
                assignee: users[1],
              },
            ],
          },
          { id: "done", title: "Done", cards: [] },
        ],
      },
    ],
  },
  {
    id: "user-experience-audit",
    title: "User Experience Audit",
    memberCount: 2,
    swimlanes: [
      {
        id: "research",
        title: "Research",
        columns: [
          {
            id: "todo",
            title: "To Do",
            cards: [
              {
                id: 3001,
                title: "Recruit 8 participants for usability study",
                priority: "Medium",
                due: "3/22",
                tag: "Research",
                assignee: users[2],
              },
            ],
          },
          {
            id: "in-progress",
            title: "In Progress",
            wip: 1,
            cards: [
              {
                id: 3002,
                title: "Heuristic review of checkout flow",
                priority: "Normal",
                due: "3/19",
                tag: "Research",
                assignee: users[1],
              },
            ],
          },
        ],
      },
    ],
  },
];

export function getBoard(id: string | undefined | null): Board {
  return boards.find((b) => b.id === id) ?? boards[0];
}
