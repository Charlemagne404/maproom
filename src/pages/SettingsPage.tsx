import { useRef, useState, type ChangeEvent } from 'react'
import { Download, HardDrive, Info, RotateCcw, Upload } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAppData } from '../app/useAppData'
import { PageHeading } from '../components/Kit'

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

export function SettingsPage() {
  const { state, updateSettings, exportData, importData, resetData } = useAppData()
  const fileInput = useRef<HTMLInputElement>(null)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  async function downloadExport() {
    try {
      const content = await exportData()
      const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }))
      const link = document.createElement('a')
      link.href = url
      link.download = `maproom-progress-${new Date().toISOString().slice(0, 10)}.json`
      link.click()
      URL.revokeObjectURL(url)
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
    if (!window.confirm('Importing replaces the progress and settings saved in this browser. Continue?')) return
    try {
      await importData(await file.text())
      setNotice('Progress imported.')
      setError('')
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'That progress file could not be imported.')
    }
  }

  async function clearProgress() {
    if (!window.confirm('Clear all saved games, favorites and preferences from this browser? This cannot be undone.')) return
    try {
      await resetData()
      setNotice('Your local progress has been cleared.')
      setError('')
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Saved data could not be cleared.')
    }
  }

  return (
    <div className="page settings-page">
      <PageHeading eyebrow="Your browser, your rules" title="Settings" description="Maproom keeps its small preferences and game history on this device." />
      <section className="settings-section">
        <div className="settings-section-heading"><span className="eyebrow">Daily puzzles</span><h2>Choose when tomorrow begins</h2><p>Your daily puzzle changes at midnight in this time zone. Daylight-saving changes are handled automatically.</p></div>
        <label className="setting-control setting-time-zone"><span><strong>Puzzle time zone</strong><small>Current setting: {state.settings.timeZone}</small></span>
          <select value={state.settings.timeZone} onChange={(event) => void updateSettings({ timeZone: event.target.value })}>
            {timeZones.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
      </section>
      <section className="settings-section">
        <div className="settings-section-heading"><span className="eyebrow">Maps</span><h2>Keep the map quiet</h2><p>Map labels appear when you point to a place. Country outlines and keyboard access remain available either way.</p></div>
        <label className="setting-control"><span><strong>Show map labels</strong><small>Display the name of the country under the pointer.</small></span>
          <input className="toggle-input" type="checkbox" checked={state.settings.mapLabels} onChange={(event) => void updateSettings({ mapLabels: event.target.checked })} />
        </label>
      </section>
      <section className="settings-section">
        <div className="settings-section-heading"><span className="eyebrow">Motion</span><h2>Use your system preference</h2><p>Maproom respects reduced-motion settings from your operating system and browser.</p></div>
        <div className="setting-readonly"><Info size={16} /><span>There is no separate motion toggle to override your device setting.</span></div>
      </section>
      <section className="settings-section data-settings">
        <div className="settings-section-heading"><span className="eyebrow">Your data</span><h2>Keep a copy, or start fresh</h2><p>Export a JSON backup before moving browsers or clearing your browser data.</p></div>
        <div className="setting-actions">
          <button className="button button-outline" type="button" onClick={() => void downloadExport()}><Download size={16} /> Export progress</button>
          <button className="button button-outline" type="button" onClick={() => fileInput.current?.click()}><Upload size={16} /> Import backup</button>
          <input ref={fileInput} type="file" accept="application/json,.json" onChange={(event) => void readImport(event)} hidden />
          <button className="button button-text-danger" type="button" onClick={() => void clearProgress()}><RotateCcw size={15} /> Reset all progress</button>
        </div>
        {(notice || error) && <div className={error ? 'form-message form-message-error' : 'form-message'} role={error ? 'alert' : 'status'}>{error || notice}</div>}
        <div className="storage-note"><HardDrive size={16} /><span>Progress is stored locally. Clearing site data in your browser may remove it. See the <Link to="/privacy">privacy note</Link>.</span></div>
      </section>
      <section className="settings-section install-section">
        <div className="settings-section-heading"><span className="eyebrow">Take it with you</span><h2>Install Maproom</h2><p>On supported browsers, use the install icon in the address bar or your browser menu. Once visited, the game shell and the data you’ve opened can work offline.</p></div>
        <div className="install-note"><Info size={17} /><span>Regional boundaries and the city gazetteer are cached as you use them, so first-time access needs a connection.</span></div>
      </section>
    </div>
  )
}
