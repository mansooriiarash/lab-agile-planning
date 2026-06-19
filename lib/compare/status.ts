const norm = (v?: string | null) => (v || '').trim().toLowerCase();
export const statusGroups = {
  current: ['current sprint'], remain: ['remain'], stopped: ['stopped','blocked','stopped / blocked','pend'], uatReview: ['uat','review'], doneReleased: ['done','released'], ready: ['approved','ready for development','next sprint']
};
export function inGroup(status: string | undefined | null, group: keyof typeof statusGroups) { return statusGroups[group].includes(norm(status)); }
export function isBlockedStatus(status?: string | null) { return inGroup(status, 'stopped'); }
export function normalizeKey(issueKey?: string | null, title?: string | null, team?: string | null) { return issueKey?.trim().toUpperCase() || `${norm(title).replace(/\s+/g,' ')}::${norm(team)}`; }
