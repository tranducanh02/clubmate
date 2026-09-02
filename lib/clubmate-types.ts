export type Gender = "male" | "female";
export type Role = "owner" | "member";
export type MembershipStatus = "pending" | "active";
export type ViewName = "dashboard" | "sessions" | "members" | "balances" | "feed" | "settings" | "profile";

export type Profile = {
  id: string;
  full_name: string;
  gender: Gender;
  phone: string | null;
  avatar_url: string | null;
};

export type Team = {
  id: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  invite_code: string;
  auto_approve: boolean;
  owner_id: string;
};

export type Membership = {
  id: string;
  team_id: string;
  user_id: string | null;
  display_name: string;
  gender: Gender;
  role: Role;
  status: MembershipStatus;
  archived_at?: string | null;
};

export type PlaySession = {
  id: string;
  team_id: string;
  sport: "badminton" | "pickleball";
  title: string;
  starts_at: string;
  location: string;
  max_slots: number | null;
  image_url: string | null;
  finalized_at: string | null;
};

export type Participant = {
  id: string;
  session_id: string;
  member_id: string | null;
  guest_name: string | null;
  guest_gender: Gender | null;
  rsvp: "going" | "not_going" | null;
  attended: boolean;
  amount_due: number | null;
};

export type SessionCost = {
  session_id: string;
  court_cost: number;
  shuttle_cost: number;
  male_factor: number;
  saved_at: string;
};

export type MonthlyPayment = {
  id: string;
  team_id: string;
  member_id: string;
  month: string;
  amount: number;
};

export type Announcement = {
  id: string;
  team_id: string;
  author_id: string;
  title: string;
  content: string;
  youtube_url: string | null;
  created_at: string;
};

export type AnnouncementComment = {
  id: string;
  announcement_id: string;
  author_id: string;
  content: string;
  created_at: string;
};

export type ClubData = {
  userId: string;
  profile: Profile;
  teams: Team[];
  memberships: Membership[];
  activeTeam: Team | null;
  activeMembership: Membership | null;
  members: Membership[];
  sessions: PlaySession[];
  participants: Participant[];
  costs: SessionCost[];
  payments: MonthlyPayment[];
  announcements: Announcement[];
  comments: AnnouncementComment[];
  authors: Record<string, string>;
  selectedMonth: string;
};
