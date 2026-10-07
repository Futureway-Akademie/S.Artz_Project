import { fireEvent, render, screen } from '@testing-library/react'
import { Logo } from './brand/Logo.tsx'
import { logoSrc } from './brand/logoAssets.ts'
import { Wordmark } from './brand/Wordmark.tsx'
import { Badge } from './ui/Badge.tsx'
import { Button } from './ui/Button.tsx'
import { SelectField, TextAreaField, TextField } from './ui/Field.tsx'
import { EmptyState, ErrorState, LoadingState } from './ui/States.tsx'

describe('Logo', () => {
  it('lädt die unveränderte Datei aus public/brand mit korrektem Seitenverhältnis', () => {
    render(<Logo variant="wortmarke" height={40} alt="PIKARTZ" />)
    const img = screen.getByRole('img', { name: 'PIKARTZ' })
    expect(img).toHaveAttribute('src', logoSrc('wortmarke'))
    expect(img.getAttribute('src')).toContain('brand/PIKARTZ%20-%20in%20Text%20-%20Liberation%20Sans%20Bold.png')
    expect(img).toHaveAttribute('height', '40')
    expect(img).toHaveAttribute('width', String(Math.round((40 * 1230) / 233)))
  })

  it('zeigt einen dezenten Platzhalter, wenn das Asset fehlt', () => {
    render(<Logo variant="bildmarke" height={48} alt="PIKARTZ" />)
    fireEvent.error(screen.getByRole('img', { name: 'PIKARTZ' }))
    expect(screen.getByTestId('logo-placeholder')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'PIKARTZ (Logo nicht verfügbar)' })).toBeInTheDocument()
  })
})

describe('Wordmark', () => {
  it('setzt „.AI“ separat für die blaue Hervorhebung', () => {
    const { container } = render(<Wordmark tone="dark" />)
    expect(container).toHaveTextContent('PIKARTZ.AI')
    expect(screen.getByText('.AI').tagName).toBe('SPAN')
  })
})

describe('Button', () => {
  it('ist standardmäßig type="button" und reagiert auf Klicks', () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Speichern</Button>)
    const button = screen.getByRole('button', { name: 'Speichern' })
    expect(button).toHaveAttribute('type', 'button')
    fireEvent.click(button)
    expect(onClick).toHaveBeenCalledOnce()
  })
})

describe('Formularfelder', () => {
  it('verknüpft Label, Hinweis und Fehler barrierefrei', () => {
    render(<TextField label="Titel" hint="Kurz und eindeutig" error="Bitte einen Titel eingeben." required />)
    const input = screen.getByRole('textbox', { name: /Titel/ })
    expect(input).toBeRequired()
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('Kurz und eindeutig Bitte einen Titel eingeben.')
  })

  it('kennzeichnet optionale Felder und setzt ohne Fehler kein aria-invalid', () => {
    render(<TextAreaField label="Notiz" />)
    const textarea = screen.getByRole('textbox', { name: 'Notiz (optional)' })
    expect(textarea).not.toHaveAttribute('aria-invalid')
  })

  it('bietet eine leere Auswahl mit Platzhaltertext an', () => {
    render(
      <SelectField
        label="Status"
        placeholder="Kein Status hinterlegt"
        options={[{ value: 'in_arbeit', label: 'In Arbeit' }]}
        defaultValue=""
      />,
    )
    const select = screen.getByRole('combobox', { name: 'Status (optional)' })
    expect(select).toHaveDisplayValue('Kein Status hinterlegt')
  })
})

describe('Badge und Zustände', () => {
  it('zeigt den Badge-Text', () => {
    render(<Badge tone="success">Erledigt</Badge>)
    expect(screen.getByText('Erledigt')).toBeInTheDocument()
  })

  it('kündigt Fehler und Laden für Screenreader an', () => {
    render(
      <>
        <EmptyState title="Noch keine Aufgaben" />
        <ErrorState title="Daten konnten nicht geladen werden" />
        <LoadingState />
      </>,
    )
    expect(screen.getByText('Noch keine Aufgaben')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Daten konnten nicht geladen werden')
    expect(screen.getByRole('status')).toHaveTextContent('Wird geladen …')
  })
})
