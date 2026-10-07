import { useId } from 'react'
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import styles from './Field.module.css'

interface FieldShellProps {
  label: string
  hint?: string
  error?: string
  required?: boolean
  /** „(optional)“ anzeigen, wenn nicht Pflicht; bei Such- und Filterfeldern abschalten */
  optionalKennzeichnen?: boolean
}

interface ShellRenderProps {
  id: string
  describedBy: string | undefined
  invalid: boolean
}

function FieldShell({
  label,
  hint,
  error,
  required,
  optionalKennzeichnen = true,
  children,
}: FieldShellProps & { children: (props: ShellRenderProps) => ReactNode }) {
  const id = useId()
  const hintId = hint ? `${id}-hinweis` : undefined
  const errorId = error ? `${id}-fehler` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}{' '}
        {required ? (
          <span className={styles.required} aria-hidden="true">
            *
          </span>
        ) : (
          optionalKennzeichnen && <span className={styles.optional}>(optional)</span>
        )}
      </label>
      {hint && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
      {children({ id, describedBy, invalid: Boolean(error) })}
      {error && (
        <p id={errorId} className={styles.error}>
          {error}
        </p>
      )}
    </div>
  )
}

type TextFieldProps = FieldShellProps & Omit<InputHTMLAttributes<HTMLInputElement>, 'id'>

export function TextField({ label, hint, error, required, optionalKennzeichnen, className, ...rest }: TextFieldProps) {
  return (
    <FieldShell label={label} hint={hint} error={error} required={required} optionalKennzeichnen={optionalKennzeichnen}>
      {({ id, describedBy, invalid }) => (
        <input
          id={id}
          className={[styles.control, className].filter(Boolean).join(' ')}
          required={required}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          {...rest}
        />
      )}
    </FieldShell>
  )
}

type TextAreaFieldProps = FieldShellProps & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'>

export function TextAreaField({ label, hint, error, required, optionalKennzeichnen, className, rows = 4, ...rest }: TextAreaFieldProps) {
  return (
    <FieldShell label={label} hint={hint} error={error} required={required} optionalKennzeichnen={optionalKennzeichnen}>
      {({ id, describedBy, invalid }) => (
        <textarea
          id={id}
          rows={rows}
          className={[styles.control, styles.textarea, className].filter(Boolean).join(' ')}
          required={required}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          {...rest}
        />
      )}
    </FieldShell>
  )
}

export interface SelectOption {
  value: string
  label: string
}

type SelectFieldProps = FieldShellProps &
  Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> & {
    options: SelectOption[]
    /** Text für die leere Auswahl, z. B. „Kein Status hinterlegt“. */
    placeholder?: string
  }

export function SelectField({
  label,
  hint,
  error,
  required,
  optionalKennzeichnen,
  options,
  placeholder,
  className,
  ...rest
}: SelectFieldProps) {
  return (
    <FieldShell label={label} hint={hint} error={error} required={required} optionalKennzeichnen={optionalKennzeichnen}>
      {({ id, describedBy, invalid }) => (
        <select
          id={id}
          className={[styles.control, styles.select, className].filter(Boolean).join(' ')}
          required={required}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          {...rest}
        >
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </FieldShell>
  )
}
