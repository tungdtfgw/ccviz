export const MAX_SESSIONS = 8;

export type TeamKey =
  | 'mu'
  | 'chelsea'
  | 'arsenal'
  | 'real-madrid'
  | 'barcelona'
  | 'juventus'
  | 'ac-milan'
  | 'liverpool';

export interface TeamConfig {
  key: TeamKey;
  name: string;
  primary: string;
  secondary: string;
  spriteKey: string;
}

export const TEAMS: TeamConfig[] = [
  { key: 'mu', name: 'Manchester United', primary: '#DA291C', secondary: '#FFE500', spriteKey: 'fan-mu' },
  { key: 'chelsea', name: 'Chelsea', primary: '#034694', secondary: '#DBA111', spriteKey: 'fan-chelsea' },
  { key: 'arsenal', name: 'Arsenal', primary: '#EF0107', secondary: '#FFFFFF', spriteKey: 'fan-arsenal' },
  { key: 'real-madrid', name: 'Real Madrid', primary: '#FFFFFF', secondary: '#00529F', spriteKey: 'fan-real-madrid' },
  { key: 'barcelona', name: 'Barcelona', primary: '#004D98', secondary: '#A50044', spriteKey: 'fan-barcelona' },
  { key: 'juventus', name: 'Juventus', primary: '#000000', secondary: '#FFFFFF', spriteKey: 'fan-juventus' },
  { key: 'ac-milan', name: 'AC Milan', primary: '#FB090B', secondary: '#000000', spriteKey: 'fan-ac-milan' },
  { key: 'liverpool', name: 'Liverpool', primary: '#C8102E', secondary: '#00B2A9', spriteKey: 'fan-liverpool' },
];

export const TEAMS_MAP: Record<TeamKey, TeamConfig> = TEAMS.reduce(
  (acc, team) => {
    acc[team.key] = team;
    return acc;
  },
  {} as Record<TeamKey, TeamConfig>
);

// Table-to-team mapping (matches client-side defaultTableTeams in BarScene)
export const TABLE_TEAM_MAPPING: TeamKey[] = [
  'mu', 'chelsea', 'arsenal', 'real-madrid',
  'barcelona', 'juventus', 'ac-milan', 'liverpool'
];

export function getTeamForSession(sessionId: string): TeamConfig {
  let hash = 0;
  for (let i = 0; i < sessionId.length; i++) {
    hash = (hash << 5) - hash + sessionId.charCodeAt(i);
    hash = hash & hash;
  }
  const index = Math.abs(hash) % TEAMS.length;
  return TEAMS[index];
}

// Get table index for a given team key
export function getTableIndexForTeam(teamKey: TeamKey): number {
  return TABLE_TEAM_MAPPING.indexOf(teamKey);
}
