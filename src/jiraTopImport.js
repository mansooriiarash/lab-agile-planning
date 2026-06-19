import { parse } from 'csv-parse/sync';

export const TOP_JIRA_PROFILE = 'TOP Jira CSV Export';

export const STATUS_GROUPS = {
  backlog: ['Backlog', 'Active Backlog'],
  readyApproved: ['Approved'],
  currentSprint: ['Current', 'In Progress', 'Development', 'Development Planned'],
  carryOver: ['Remain'],
  blockedAttention: ['Stopped', 'Pending'],
  reviewUat: ['Review'],
  doneReleased: ['Released'],
  rejected: ['Rejected'],
};

const GROUP_LABELS = {
  backlog: 'Backlog', readyApproved: 'Ready/Approved', currentSprint: 'Current Sprint',
  carryOver: 'Carry-over', blockedAttention: 'Blocked/Attention', reviewUat: 'Review/UAT',
  doneReleased: 'Done/Released', rejected: 'Rejected', other: 'Other'
};

const col = {
  summary: 'Summary', key: 'Issue key', id: 'Issue id', type: 'Issue Type', status: 'Status', priority: 'Priority',
  assignee: 'Assignee', reporter: 'Reporter', creator: 'Creator', created: 'Created', updated: 'Updated',
  components: 'Component/s', labels: 'Labels', description: 'Description', originalEstimate: 'Original Estimate',
  remainingEstimate: 'Remaining Estimate', carryOnSprint: 'Custom field (Carry on Sprint)', dueDate: 'Custom field (Due Date (jalali))',
  letterNumber: 'Custom field (Letter Number)', originalStoryPoints: 'Custom field (Original story points)',
  requestDate: 'Custom field (Request Date)', riceValue: 'Custom field (Rice Value)', sprint: 'Sprint',
  contact: 'Custom field (StakeHolder Contact Point)', director: 'Custom field (StakeHolder Director)', vp: 'Custom field (StakeHolder VP)',
  storyPoints: 'Custom field (Story Points)', team: 'Custom field (Team)', flagged: 'Custom field (Flagged)', comment: 'Comment'
};

export function parseJiraCsv(csvText) {
  const text = csvText.charCodeAt(0) === 0xfeff ? csvText.slice(1) : csvText;
  const rows = parse(text, { bom: true, relax_column_count: true, skip_empty_lines: true });
  if (!rows.length) return { headers: [], records: [] };
  const headers = rows[0].map(h => String(h ?? '').trim());
  const records = rows.slice(1).map(values => rowToRecord(headers, values));
  return { headers, records };
}

function rowToRecord(headers, values) {
  const rawJson = {};
  headers.forEach((header, i) => {
    const value = clean(values[i]);
    if (Object.hasOwn(rawJson, header)) rawJson[header] = Array.isArray(rawJson[header]) ? [...rawJson[header], value] : [rawJson[header], value];
    else rawJson[header] = value;
  });
  return rawJson;
}

const clean = v => String(v ?? '').trim();
const values = (raw, name) => raw[name] === undefined ? [] : (Array.isArray(raw[name]) ? raw[name] : [raw[name]]);
const first = (raw, name) => values(raw, name).find(v => clean(v)) || '';
const nonEmpty = (raw, name) => values(raw, name).map(clean).filter(Boolean);
const num = v => { const n = Number(String(v ?? '').replace(/,/g, '')); return Number.isFinite(n) ? n : null; };
const hours = seconds => seconds == null ? 0 : seconds / 3600;

export function normalizeIssue(raw) {
  const components = nonEmpty(raw, col.components);
  const teamField = first(raw, col.team);
  const story = first(raw, col.storyPoints) || first(raw, col.originalStoryPoints);
  const originalEstimateSeconds = num(first(raw, col.originalEstimate));
  const remainingEstimateSeconds = num(first(raw, col.remainingEstimate));
  const comments = nonEmpty(raw, col.comment);
  return {
    issueKey: first(raw, col.key), issueId: first(raw, col.id), title: first(raw, col.summary), issueType: first(raw, col.type),
    status: first(raw, col.status), statusGroup: classifyStatus(first(raw, col.status)), priority: first(raw, col.priority),
    assignee: first(raw, col.assignee), reporter: first(raw, col.reporter), creator: first(raw, col.creator),
    createdAtJira: first(raw, col.created), updatedAtJira: first(raw, col.updated), components,
    team: teamField || components.join(', '), teamSource: teamField ? 'Custom field (Team)' : 'Component/s',
    labels: first(raw, col.labels), description: first(raw, col.description), stakeholderDeputy: first(raw, col.vp),
    stakeholderDirector: nonEmpty(raw, col.director), stakeholderContactPoint: nonEmpty(raw, col.contact),
    storyPoints: num(story), storyPointSource: first(raw, col.storyPoints) ? 'Story Points' : (first(raw, col.originalStoryPoints) ? 'Original story points' : ''),
    originalEstimateSeconds, remainingEstimateSeconds, estimateHours: hours(originalEstimateSeconds || remainingEstimateSeconds),
    riceValue: num(first(raw, col.riceValue)), letterNumber: first(raw, col.letterNumber), requestDateJalali: first(raw, col.requestDate),
    dueDateJalali: first(raw, col.dueDate), sprint: first(raw, col.sprint), isFlagged: Boolean(first(raw, col.flagged)), blockerReason: first(raw, col.flagged),
    comments, latestComment: comments.at(-1) || '', rawJson: raw
  };
}

export function importTopJiraCsv(csvText, { sprintName, reportDate = new Date().toISOString() } = {}) {
  const { headers, records } = parseJiraCsv(csvText);
  const duplicateHeaders = headers.filter((h, i) => h && headers.indexOf(h) !== i);
  const issues = records.map(normalizeIssue).filter(i => i.issueKey);
  return { profile: TOP_JIRA_PROFILE, sprintName: sprintName || '', reportDate, headers, duplicateHeaders: [...new Set(duplicateHeaders)], issues, analytics: snapshotAnalytics(issues, sprintName) };
}

export function classifyStatus(status) {
  for (const [group, statuses] of Object.entries(STATUS_GROUPS)) if (statuses.includes(status)) return group;
  return 'other';
}

function inc(obj, key, by = 1) { obj[key || 'نامشخص'] = (obj[key || 'نامشخص'] || 0) + by; }
export function snapshotAnalytics(issues, sprintName = '') {
  const a = { totalIssues: issues.length, byStatus: {}, byStatusGroup: {}, byTeam: {}, byStakeholderVp: {}, byPriority: {}, byIssueType: {},
    flaggedCount: 0, stoppedCount: 0, pendingCount: 0, remainCount: 0, currentSprintCount: 0, reviewCount: 0, releasedCount: 0,
    estimateHoursByTeam: {}, storyPointsByTeam: {}, dataQuality: { missingStoryPoints: 0, missingStakeholder: 0, missingDueDate: 0, missingTeam: 0, missingSprint: 0, sprintNameRequired: !sprintName } };
  for (const i of issues) {
    inc(a.byStatus, i.status); inc(a.byStatusGroup, GROUP_LABELS[i.statusGroup]); inc(a.byTeam, i.team); inc(a.byStakeholderVp, i.stakeholderDeputy); inc(a.byPriority, i.priority); inc(a.byIssueType, i.issueType);
    if (i.isFlagged) a.flaggedCount++; if (i.status === 'Stopped') a.stoppedCount++; if (i.status === 'Pending') a.pendingCount++; if (i.status === 'Remain') a.remainCount++; if (i.statusGroup === 'currentSprint') a.currentSprintCount++; if (i.status === 'Review') a.reviewCount++; if (i.status === 'Released') a.releasedCount++;
    if (i.storyPoints == null) { a.dataQuality.missingStoryPoints++; inc(a.estimateHoursByTeam, i.team, i.estimateHours); } else inc(a.storyPointsByTeam, i.team, i.storyPoints);
    if (!i.stakeholderDeputy) a.dataQuality.missingStakeholder++; if (!i.dueDateJalali) a.dataQuality.missingDueDate++; if (!i.team) a.dataQuality.missingTeam++; if (!i.sprint) a.dataQuality.missingSprint++;
  }
  return a;
}

export function compareSnapshots(previous, current) {
  const prev = new Map(previous.issues.map(i => [i.issueKey, i]));
  const cur = new Map(current.issues.map(i => [i.issueKey, i]));
  const changes = [];
  for (const [key, i] of cur) {
    const p = prev.get(key); if (!p) { changes.push(ch('ADDED', key)); continue; }
    cmp(changes, key, 'STATUS_CHANGED', p.status, i.status); cmp(changes, key, 'PRIORITY_CHANGED', p.priority, i.priority);
    cmp(changes, key, 'COMPONENT_CHANGED', p.components.join('|'), i.components.join('|')); cmp(changes, key, 'TEAM_CHANGED', p.team, i.team);
    cmp(changes, key, 'STAKEHOLDER_VP_CHANGED', p.stakeholderDeputy, i.stakeholderDeputy); cmp(changes, key, 'STORY_POINTS_CHANGED', p.storyPoints, i.storyPoints);
    cmp(changes, key, 'ORIGINAL_ESTIMATE_CHANGED', p.originalEstimateSeconds, i.originalEstimateSeconds); cmp(changes, key, 'REMAINING_ESTIMATE_CHANGED', p.remainingEstimateSeconds, i.remainingEstimateSeconds); cmp(changes, key, 'FLAGGED_CHANGED', p.isFlagged, i.isFlagged);
    if ((i.comments?.length || 0) > (p.comments?.length || 0)) changes.push(ch('COMMENT_ADDED', key));
    movement(changes, key, p, i);
  }
  for (const key of prev.keys()) if (!cur.has(key)) changes.push(ch('REMOVED', key));
  return { changes, analytics: comparisonAnalytics(changes, previous, current) };
}
const ch = (type, issueKey) => ({ type, issueKey });
const cmp = (arr, key, type, a, b) => { if ((a ?? '') !== (b ?? '')) arr.push(ch(type, key)); };
function movement(arr, key, p, i) {
  const ps = p.statusGroup, cs = i.statusGroup;
  if (cs === 'currentSprint' && ps !== cs) arr.push(ch('MOVED_TO_CURRENT', key));
  if (i.status === 'Remain' && p.status !== 'Remain') arr.push(ch('MOVED_TO_REMAIN', key));
  if (cs === 'blockedAttention' && ps !== cs) arr.push(ch('MOVED_TO_STOPPED_OR_PENDING', key));
  if (cs === 'reviewUat' && ps !== cs) arr.push(ch('MOVED_TO_REVIEW', key));
  if (cs === 'doneReleased' && ps !== cs) arr.push(ch('MOVED_TO_RELEASED', key));
  if (ps === 'currentSprint' && cs !== 'currentSprint') arr.push(ch('MOVED_OUT_OF_CURRENT', key));
  if (i.status === 'Remain') arr.push(ch('CARRY_OVER', key));
  if ((i.storyPoints || 0) > (p.storyPoints || 0) || (i.originalEstimateSeconds || 0) > (p.originalEstimateSeconds || 0)) arr.push(ch('SCOPE_INCREASE', key));
  if ((i.storyPoints || 0) < (p.storyPoints || 0) || (i.originalEstimateSeconds || 0) < (p.originalEstimateSeconds || 0)) arr.push(ch('SCOPE_DECREASE', key));
}
function count(changes, type) { return changes.filter(c => c.type === type).length; }
export function comparisonAnalytics(changes, previous, current) {
  const changedIssues = new Set(changes.map(c => c.issueKey)).size;
  return { addedIssueCount: count(changes, 'ADDED'), removedIssueCount: count(changes, 'REMOVED'), statusChangedCount: count(changes, 'STATUS_CHANGED'), movedToCurrentCount: count(changes, 'MOVED_TO_CURRENT'), movedToRemainCount: count(changes, 'MOVED_TO_REMAIN'), movedToStoppedOrPendingCount: count(changes, 'MOVED_TO_STOPPED_OR_PENDING'), movedToReviewCount: count(changes, 'MOVED_TO_REVIEW'), movedToReleasedCount: count(changes, 'MOVED_TO_RELEASED'), movedOutOfCurrentCount: count(changes, 'MOVED_OUT_OF_CURRENT'), priorityChangedCount: count(changes, 'PRIORITY_CHANGED'), stakeholderChangedCount: count(changes, 'STAKEHOLDER_VP_CHANGED'), componentTeamChangedCount: count(changes, 'COMPONENT_CHANGED') + count(changes, 'TEAM_CHANGED'), flaggedChangedCount: count(changes, 'FLAGGED_CHANGED'), estimateDelta: current.issues.reduce((s, i) => s + (i.originalEstimateSeconds || 0), 0) - previous.issues.reduce((s, i) => s + (i.originalEstimateSeconds || 0), 0), scopeChurnPercentage: pct(changedIssues, current.issues.length), carryOverPercentage: pct(current.analytics.remainCount, current.issues.length), blockedAttentionPercentage: pct(current.analytics.stoppedCount + current.analytics.pendingCount + current.analytics.flaggedCount, current.issues.length) };
}
const pct = (a, b) => b ? Math.round((a / b) * 1000) / 10 : 0;

export function generatePersianReport(snapshot, comparison) {
  const a = snapshot.analytics, q = a.dataQuality, c = comparison?.analytics;
  const dq = `| شاخص | تعداد |\n|---|---:|\n| بدون Story Point | ${q.missingStoryPoints} |\n| بدون ذی‌نفع/معاونت | ${q.missingStakeholder} |\n| بدون Due Date | ${q.missingDueDate} |\n| بدون تیم | ${q.missingTeam} |\n| بدون Sprint در فایل | ${q.missingSprint} |`;
  return `# گزارش مدیریتی اسپرینت ${snapshot.sprintName || 'نامشخص'}\n\n## 1. خلاصه مدیریتی\nواقعیت: تعداد کل آیتم‌ها ${a.totalIssues} است. Current برابر ${a.currentSprintCount}، Remain برابر ${a.remainCount}، Stopped/Pending/Impediment برابر ${a.stoppedCount + a.pendingCount + a.flaggedCount} و Released برابر ${a.releasedCount} است.\n\n## 2. کیفیت داده گزارش\n${dq}\n\nتحلیل: ${q.missingDueDate ? 'به دلیل نبود Due Date برای بخشی از داده‌ها، ریسک موعد تحویل به طور کامل قابل محاسبه نیست.' : 'داده Due Date برای محاسبه ریسک موجود است.'} ${q.sprintNameRequired ? 'Sprint در فایل خالی است و نام اسپرینت باید هنگام آپلود وارد شود.' : ''}\n\n## 3. تغییرات کلیدی نسبت به گزارش قبلی\n${c ? `Added: ${c.addedIssueCount}، Removed: ${c.removedIssueCount}، Status changed: ${c.statusChangedCount}، Moved to Current: ${c.movedToCurrentCount}، Moved to Remain: ${c.movedToRemainCount}، Moved to Released: ${c.movedToReleasedCount}.` : 'گزارش قبلی برای مقایسه ثبت نشده است.'}\n\n## 4. تحلیل وضعیت کلی آیتم‌ها\n${table(a.byStatusGroup)}\n\n## 5. تحلیل تیم‌ها / کامپوننت‌ها\n${table(a.byTeam)}\n\n## 6. تحلیل معاونت‌ها و ذی‌نفعان\n${table(a.byStakeholderVp)}\n\n## 7. تحلیل Scope و تغییرات برنامه اسپرینت\n${c ? `Scope churn برابر ${c.scopeChurnPercentage}% و تغییر تخمین برابر ${Math.round(c.estimateDelta / 3600)} ساعت است.` : 'برای محاسبه Scope churn نیاز به snapshot قبلی است.'}\n\n## 8. تحلیل آیتم‌های Current\nتعداد آیتم‌های Current/In Progress/Development برابر ${a.currentSprintCount} است.\n\n## 9. تحلیل آیتم‌های Remain و Carry-over\nتعداد Remain برابر ${a.remainCount} است${c ? ` و carry-over برابر ${c.carryOverPercentage}% است.` : '.'}\n\n## 10. تحلیل آیتم‌های Stopped / Pending / Impediment\nStopped: ${a.stoppedCount}، Pending: ${a.pendingCount}، Flagged/Impediment: ${a.flaggedCount}.\n\n## 11. تحلیل آیتم‌های Review و Released\nReview: ${a.reviewCount}، Released: ${a.releasedCount}.\n\n## 12. آیتم‌های دارای تغییر مهم\n${comparison ? comparison.changes.slice(0, 50).map(x => `- ${x.issueKey}: ${x.type}`).join('\n') : 'بدون مقایسه.'}\n\n## 13. ریسک‌ها و موارد نیازمند تصمیم مدیریتی\n- تصمیم درباره آیتم‌های Stopped/Pending/Flagged: ${a.stoppedCount + a.pendingCount + a.flaggedCount} مورد.\n- تکمیل داده‌های ناقص Story Point یا استفاده شفاف از ساعت تخمینی: ${q.missingStoryPoints} مورد.\n- تکمیل Due Date برای محاسبه ریسک زمان‌بندی: ${q.missingDueDate} مورد.\n\n## 14. پیشنهادهای عملی برای جلسه Sprint Planning\n- ظرفیت تیم‌ها بر اساس Story Point موجود و در صورت نبود آن با برچسب «ساعت تخمینی» بررسی شود.\n- آیتم‌های Remain و Flagged پیش از پذیرش Scope جدید تعیین تکلیف شوند.\n- مالکیت آیتم‌های بدون معاونت/ذی‌نفع مشخص شود.`;
}
function table(obj) { return '| عنوان | تعداد |\n|---|---:|\n' + Object.entries(obj).map(([k, v]) => `| ${k} | ${Math.round(v * 10) / 10} |`).join('\n'); }
export function markdownToHtml(md) { return md.replace(/^# (.*)$/gm, '<h1>$1</h1>').replace(/^## (.*)$/gm, '<h2>$1</h2>').replace(/\n/g, '<br>'); }
