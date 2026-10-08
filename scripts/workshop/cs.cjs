// Aktualisiert CURRENT_STATE.md aus roadmap.json/progress.json. Arg: Zeile für „Zuletzt abgeschlossen“ (optional)
const fs = require('fs')
process.chdir(require('path').join(__dirname, '..', '..'))
const neu = process.argv[2]
const r = JSON.parse(fs.readFileSync('.workshop/roadmap.json', 'utf8'))
const pr = JSON.parse(fs.readFileSync('.workshop/progress.json', 'utf8'))
const all = r.phases.flatMap((p) => p.tasks)
const fmt = (n) => n.toLocaleString('de-DE', { maximumFractionDigits: 2 })
let c = fs.readFileSync('.workshop/CURRENT_STATE.md', 'utf8')
c = c.replace(/Status: aktiv, Roadmap v\d+, Fortschritt [^)]*\)/, `Status: aktiv, Roadmap v${r.roadmapVersion}, Fortschritt ${fmt(pr.overall)} % (${pr.completedWeight} von ${pr.totalWeight} Gewichtspunkten, ${pr.completedTasks} von ${pr.totalTasks} Tasks)`)
const phase = r.phases.find((p) => p.id === pr.currentPhaseId)
c = c.replace(/## Aktive Phase\n\n[^\n]*\n/, `## Aktive Phase\n\n${phase ? `${phase.title} (${phase.id}).` : 'Alle Phasen abgeschlossen.'}\n`)
const aktiv = all.find((t) => t.status === 'in_progress')
c = c.replace(/## Aktive Aufgabe\n\n[^\n]*\n/, `## Aktive Aufgabe\n\n${aktiv ? `${aktiv.id} – ${aktiv.title} (in_progress seit ${aktiv.startedAt}).` : 'Keine.'}\n`)
if (neu) c = c.replace('## Zuletzt abgeschlossen\n\n', `## Zuletzt abgeschlossen\n\n- ${neu}\n`)
const ready = all.filter((t) => t.status === 'ready').map((t) => `- ${t.id} – ${t.title}`).join('\n')
c = c.replace(/## Bereite nächste Aufgaben\n\n[\s\S]*?\n\n(?=## )/, `## Bereite nächste Aufgaben\n\n${ready || 'Keine.'}\n\n`)
const label = { completed: '✅ erledigt', in_progress: '🔨 in Arbeit', ready: '▶️ startbar', blocked: '⛔ blockiert', planned: '⏳ geplant', cancelled: 'abgebrochen', superseded: 'ersetzt' }
let md = '## Gesamtplan (aus roadmap.json)\n\n'
for (const p of r.phases) {
  md += `### ${p.title}\n\n| Task | Aufgabe | Status | Wartet auf |\n|---|---|---|---|\n`
  for (const t of p.tasks) {
    const offen = t.dependsOn.filter((d) => all.find((x) => x.id === d)?.status !== 'completed')
    md += `| ${t.id} | ${t.title} | ${label[t.status]} | ${t.status === 'completed' ? '' : offen.join(', ') || '–'} |\n`
  }
  md += '\n'
}
c = c.replace(/## Gesamtplan \(aus roadmap.json\)\n[\s\S]*?(?=## Blockiert)/, md)
const blockiert = all.filter((t) => t.status === 'blocked').map((t) => `- ${t.id} – ${t.title}`).join('\n')
c = c.replace(/## Blockiert\n\n[\s\S]*?\n\n(?=## )/, `## Blockiert\n\n${blockiert || 'Nichts.'}\n\n`)
fs.writeFileSync('.workshop/CURRENT_STATE.md', c)
console.log(c.split('## Gesamtplan')[0])
