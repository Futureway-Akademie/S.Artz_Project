import { fireEvent, render, screen, within } from '@testing-library/react'
import axe from 'axe-core'
import { Balken, Diagramm, Fortschritt, Heatmap, Ring, Wochenverlauf } from './Diagramme.tsx'

const punkte = [
  { schluessel: 'a', label: 'In Arbeit', wert: 3 },
  { schluessel: 'b', label: 'Idee', wert: 1 },
]

describe('Diagramm-Bausteine', () => {
  it('zeigt Legende mit Werten und Anteilen und schaltet auf eine Tabelle um', () => {
    render(
      <Diagramm titel="Projekte nach Status" zusammenfassung="4 Projekte" kopfzeilen={['Status', 'Anzahl']} zeilen={punkte.map((p) => [p.label, p.wert])}>
        <Ring punkte={punkte} einheit="Projekte" />
      </Diagramm>,
    )
    const figur = screen.getByRole('figure', { name: 'Projekte nach Status' })
    expect(within(figur).getByText('In Arbeit').closest('li')).toHaveTextContent('3 (75 %)')
    fireEvent.click(within(figur).getByRole('button', { name: 'Tabelle' }))
    const tabelle = within(figur).getByRole('table')
    expect(within(tabelle).getByRole('rowheader', { name: 'Idee' }).closest('tr')).toHaveTextContent('1')
    expect(within(figur).getByRole('button', { name: 'Grafik' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('Balken, Verlauf, Fortschritt und Heatmap sind barrierefrei', async () => {
    const { container } = render(
      <main>
        <Diagramm titel="Balken" zusammenfassung="x" kopfzeilen={['a', 'b']} zeilen={[]}>
          <Balken punkte={punkte} />
        </Diagramm>
        <Diagramm titel="Verlauf" zusammenfassung="x" kopfzeilen={['a', 'b']} zeilen={[]}>
          <Wochenverlauf
            reihe={[{ label: '05.10.', start: '2026-10-05', werte: { neu: 2, erledigt: 1 } }]}
            serien={[
              { schluessel: 'neu', label: 'Neu' },
              { schluessel: 'erledigt', label: 'Erledigt' },
            ]}
          />
        </Diagramm>
        <Fortschritt wert={47} gesamt={100} label="Kurstage" />
        <Heatmap tage={[{ datum: '2026-10-05', anzahl: 2 }]} />
      </main>,
    )
    expect(screen.getByText('In Arbeit').closest('li')).toHaveTextContent('3')
    expect(screen.getByText(/Neu:/)).toHaveTextContent('Neu: 2')
    expect(screen.getByRole('progressbar', { name: 'Kurstage' })).toHaveAttribute('aria-valuenow', '47')
    const verstoesse = (await axe.run(container, { rules: { 'color-contrast': { enabled: false } } })).violations.map((v) => v.id)
    expect(verstoesse).toEqual([])
  })
})
