const fs = require('fs')
process.chdir(require('path').join(__dirname, '..', '..'))
const [, , cmd, id, ...rest] = process.argv
const ts = new Date().toISOString().replace(/\.\d+Z/, 'Z')
const r = JSON.parse(fs.readFileSync('.workshop/roadmap.json', 'utf8'))
const all = r.phases.flatMap((p) => p.tasks)
const t = all.find((x) => x.id === id)
const log = (e) => fs.appendFileSync('.workshop/activity.jsonl', JSON.stringify({ timestamp: ts, ...e }) + '\n')
let currentTaskId = null
if (cmd === 'start') {
  t.status = 'in_progress'; t.startedAt = ts; currentTaskId = id
  log({ type: 'task_started', taskId: id, summary: `Task '${t.title}' gestartet.` })
}
if (cmd === 'dod') { t.definitionOfDone.push(...rest); log({ type: 'roadmap_updated', taskId: id, summary: `Definition of Done von '${t.title}' laut docs/architecture.md ergänzt.` }); currentTaskId = id }
if (cmd === 'cancel') {
  t.status = 'cancelled'; t.completedAt = null
  log({ type: 'task_cancelled', taskId: id, summary: rest[0] })
}
if (cmd === 'complete') {
  if (!t.startedAt) { t.startedAt = ts; log({ type: 'task_started', taskId: id, summary: `Task '${t.title}' gestartet.` }) }
  const v = JSON.parse(fs.readFileSync(rest[0], 'utf8'))
  t.status = 'completed'; t.completedAt = ts; t.verification = { status: 'passed', summary: v.summary, commands: v.commands, checkedAt: ts }
  log({ type: 'verification_passed', taskId: id, summary: v.short })
  log({ type: 'task_completed', taskId: id, summary: `Task '${t.title}' abgeschlossen.` })
  for (const c of all) {
    if (c.status === 'planned' && c.dependsOn.every((d) => all.find((x) => x.id === d)?.status === 'completed')) {
      c.status = 'ready'; log({ type: 'task_ready', taskId: c.id, summary: `Task '${c.title}' ist startbar.` })
    }
  }
}
for (const p of r.phases) {
  const s = p.tasks.map((x) => x.status).filter((x) => x !== 'cancelled')
  p.status = s.every((x) => x === 'completed') ? 'completed' : s.some((x) => x === 'completed' || x === 'in_progress') ? 'in_progress' : s.some((x) => x === 'ready') ? 'ready' : 'planned'
}
fs.writeFileSync('.workshop/roadmap.json', JSON.stringify(r, null, 2) + '\n')
const scope = all.filter((x) => ['planned', 'ready', 'in_progress', 'blocked', 'completed'].includes(x.status))
const done = scope.filter((x) => x.status === 'completed')
const tw = scope.reduce((s, x) => s + x.weight, 0), cw = done.reduce((s, x) => s + x.weight, 0)
const phase = r.phases.find((p) => p.status !== 'completed')
const pr = { schemaVersion: 1, overall: Math.round((cw / tw) * 10000) / 100, completedWeight: cw, totalWeight: tw, currentPhaseId: phase ? phase.id : null, currentTaskId, completedTasks: done.length, totalTasks: scope.length, blockedTasks: scope.filter((x) => x.status === 'blocked').length, updatedAt: ts }
fs.writeFileSync('.workshop/progress.json', JSON.stringify(pr, null, 2) + '\n')
console.log(ts, `overall=${pr.overall} cw=${cw} done=${done.length}`)
console.log('ready:', all.filter((x) => x.status === 'ready').map((x) => x.id).join(', '))
