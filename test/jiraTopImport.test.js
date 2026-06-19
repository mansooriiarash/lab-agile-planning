import test from 'node:test';
import assert from 'node:assert/strict';
import { importTopJiraCsv, compareSnapshots, generatePersianReport } from '../src/jiraTopImport.js';

const csv = '\ufeffIssue key,Summary,Issue Type,Status,Priority,Component/s,Component/s,Custom field (Team),Custom field (StakeHolder VP),Custom field (StakeHolder Director),Custom field (StakeHolder Director),Custom field (Story Points),Custom field (Original story points),Original Estimate,Remaining Estimate,Custom field (Flagged),Comment,Comment,Custom field (Due Date (jalali)),Sprint\n' +
'TOP-1,Login,Story,Current,High,Core,API,,VP1,Dir1,Dir2,,5,7200,3600,Blocked,old,new,,\n' +
'TOP-2,Search,Bug,Stopped,Low,Search,,,VP2,,,,,3600,,Reason,,,,';

test('imports BOM CSV with duplicate headers and normalized fallback fields', () => {
  const snap = importTopJiraCsv(csv, { sprintName: 'Sprint 1', reportDate: '2026-06-19' });
  assert.equal(snap.headers.length, 20);
  assert.deepEqual(snap.duplicateHeaders.sort(), ['Comment','Component/s','Custom field (StakeHolder Director)'].sort());
  assert.deepEqual(snap.issues[0].rawJson['Component/s'], ['Core','API']);
  assert.equal(snap.issues[0].team, 'Core, API');
  assert.equal(snap.issues[0].storyPoints, 5);
  assert.equal(snap.issues[0].isFlagged, true);
  assert.equal(snap.issues[0].latestComment, 'new');
  assert.equal(snap.analytics.currentSprintCount, 1);
  assert.equal(snap.analytics.stoppedCount, 1);
  assert.equal(snap.analytics.dataQuality.missingDueDate, 2);
});

test('compares snapshots using issue key and detects movements', () => {
  const prev = importTopJiraCsv(csv.replace('Current','Backlog'), { sprintName: 'Sprint 1' });
  const cur = importTopJiraCsv(csv, { sprintName: 'Sprint 1' });
  const diff = compareSnapshots(prev, cur);
  assert.ok(diff.changes.some(c => c.issueKey === 'TOP-1' && c.type === 'MOVED_TO_CURRENT'));
  assert.equal(diff.analytics.statusChangedCount, 1);
});

test('generates Persian report with missing due date warning', () => {
  const snap = importTopJiraCsv(csv, { sprintName: 'Sprint 1' });
  const report = generatePersianReport(snap);
  assert.match(report, /خلاصه مدیریتی/);
  assert.match(report, /ریسک موعد تحویل/);
});
