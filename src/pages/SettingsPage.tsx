import { useRef, useState, type ChangeEvent } from 'react'
import { Download, HardDrive, Info, Monitor, Moon, RotateCcw, Sun, Upload } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAppData } from '../app/useAppData'
import { PageHeading } from '../components/Kit'
import type { UserSettings } from '../geography/types'

const timeZones = [
  ['Europe/Stockholm', 'Stockholm'],
  ['Europe/London', 'London'],
  ['Europe/Paris', 'Paris'],
  ['America/New_York', 'New York'],
  ['America/Chicago', 'Chicago'],
  ['America/Los_Angeles', 'Los Angeles'],
  ['America/Sao_Paulo', 'São Paulo'],
  ['Africa/Cairo', 'Cairo'],
  ['Asia/Dubai', 'Dubai'],
  ['Asia/Kolkata', 'Kolkata'],
  ['Asia/Tokyo', 'Tokyo'],
  ['Australia/Sydney', 'Sydney'],
  ['UTC', 'UTC'],
]

const themeOptions = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
] as const

export function SettingsPage() {
  const { state, updateSettings, exportData, importData, resetData } = useAppData()
  const fileInput = useRef<HTMLInputElement>(null)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  async function changePreference(patch: Partial<UserSettings>) {
    try {
      await updateSettings(patch)
      setError('')
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'That preference could not be saved.')
    }
  }

  async function downloadExport() {
    try {
      const content = await exportData()
      const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }))
      const link = document.createElement('a')
      link.href = url
      link.download = `maproom-progress-${new Date().toISOString().slice(0, 10)}.json`
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
      setNotice('Your progress file is ready.')
      setError('')
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Progress could not be exported.')
    }
  }

  async function readImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file) return
    if (file.size > 5_000_000) {
      setError('This file is larger than the 5 MB import limit.')
      return
    }
    if (!window.confirm('Importing replaces saved progress and preferences on this browser. Continue?')) return
    try {
      await importData(await file.text())
      setNotice('Progress imported.')
      setError('')
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'That progress file could not be imported.')
    }
  }

  async function clearProgress() {
    if (!window.confirm('Reset all saved games, favorites, and preferences on this browser? This cannot be undone.')) return
    try {
      await resetData()
      setNotice('Saved data has been reset.')
      setError('')
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Saved data could not be cleared.')
    }
  }

  return (
    <div className="page settings-page">
      <PageHeading eyebrow="Your browser, your rules" title="Settings" description="A few small choices for a Maproom that feels like yours." />

      <section className="settings-section settings-appearance-section" aria-labelledby="settings-appearance-title">
        <div className="settings-section-heading">
          <span className="eyebrow">Appearance</span>
          <h2 id="settings-appearance-title">Choose your theme</h2>
          <p>Set the tone for every map and puzzle.</p>
        </div>
        <fieldset className="theme-picker">
          <legend className="sr-only">Color theme</legend>
          {themeOptions.map(({ value, label, icon: Icon }) => (
            <label key={value} className={`theme-option${state.settings.theme === value ? ' is-selected' : ''}`}>
              <input
                type="radio"
                name="theme"
                value={value}
                checked={state.settings.theme === value}
                onChange={() => void changePreference({ theme: value })}
              />
              <span className="theme-option-card"><Icon size={19} strokeWidth={1.8} aria-hidden="true" /><strong>{label}</strong></span>
            </label>
          ))}
        </fieldset>
      </section>

      <section className="settings-section" aria-labelledby="settings-daily-title">
        <div className="settings-section-heading">
          <span className="eyebrow">Daily play</span>
          <h2 id="settings-daily-title">Set your puzzle day</h2>
          <p>Tomorrow begins at midnight in this time zone.</p>
        </div>
        <label className="setting-control setting-time-zone">
          <span><strong>Puzzle time zone</strong></span>
          <select value={state.settings.timeZone} onChange={(event) => void changePreference({ timeZone: event.target.value })}>
            {timeZones.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
      </section>

      <section className="settings-section" aria-labelledby="settings-map-title">
        <div className="settings-section-heading">
          <span className="eyebrow">Maps</span>
          <h2 id="settings-map-title">Keep labels close</h2>
          <p>Show the country name beneath your pointer.</p>
        </div>
        <label className="setting-control setting-map-labels">
          <span><strong>Show map labels</strong></span>
          <input className="toggle-input" type="checkbox" checked={state.settings.mapLabels} onChange={(event) => void changePreference({ mapLabels: event.target.checked })} />
        </label>
      </section>

      <section className="settings-section data-settings" aria-labelledby="settings-data-title">
        <div className="settings-section-heading">
          <span className="eyebrow">Your data</span>
          <h2 id="settings-data-title">Take it with you</h2>
          <p>Progress and preferences stay in this browser.</p>
        </div>
        <div className="settings-data-content">
          <div className="setting-actions">
            <button className="button button-outline" type="button" onClick={() => void downloadExport()}><Download size={16} /> Export progress</button>
            <button className="button button-outline" type="button" onClick={() => fileInput.current?.click()}><Upload size={16} /> Import backup</button>
            <input ref={fileInput} type="file" accept="application/json,.json" onChange={(event) => void readImport(event)} hidden />
            <button className="button button-text-danger" type="button" onClick={() => void clearProgress()}><RotateCcw size={15} /> Reset saved data</button>
          </div>
          {(notice || error) && <div className={error ? 'form-message form-message-error' : 'form-message'} role={error ? 'alert' : 'status'}>{error || notice}</div>}
          <div className="storage-note"><HardDrive size={16} aria-hidden="true" /><span>Browser data can be cleared in your browser settings. Read the <Link to="/privacy">privacy note</Link>.</span></div>
        </div>
      </section>

      <section className="settings-section install-section" aria-labelledby="settings-offline-title">
        <div className="settings-section-heading">
          <span className="eyebrow">Offline play</span>
          <h2 id="settings-offline-title">Bring Maproom along</h2>
          <p>Install from your browser menu to keep the game shell close at hand.</p>
        </div>
        <div className="install-note"><Info size={17} aria-hidden="true" /><span>Maps and city details cache as you use them. First-time access needs a connection.</span></div>
      </section>
    </div>
  )
}
