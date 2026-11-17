import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Download, HardDrive, Info, RotateCcw, Upload } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAppData } from '../app/useAppData'
import { PageHeading } from '../components/Kit'
import type { UserSettings } from '../geography/types'

const timeZones = [
  ['Europe/Stockholm', 'Stockholm'], ['Europe/London', 'London'], ['Europe/Paris', 'Paris'],
  ['America/New_York', 'New York'], ['America/Chicago', 'Chicago'], ['America/Los_Angeles', 'Los Angeles'],
  ['America/Sao_Paulo', 'São Paulo'], ['Africa/Cairo', 'Cairo'], ['Asia/Dubai', 'Dubai'],
  ['Asia/Kolkata', 'Kolkata'], ['Asia/Tokyo', 'Tokyo'], ['Australia/Sydney', 'Sydney'], ['UTC', 'UTC'],
]

export function SettingsPage() {
  const { state, updateSettings, exportData, importData, resetData } = useAppData()
  const fileInput = useRef<HTMLInputElement>(null)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [confirmReset, setConfirmReset] = useState(false)
  const [offline, setOffline] = useState(!navigator.onLine)

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  async function changePreference(patch: Partial<UserSettings>) {
    try {
      await updateSettings(patch)
      setError('')
      setNotice('')
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
      setNotice('Progress exported.')
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
    if (!confirmReset) {
      setConfirmReset(true)
      setNotice('')
      setError('')
      return
    }
    try {
      await resetData()
      setConfirmReset(false)
      setNotice('Saved data has been reset.')
      setError('')
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Saved data could not be cleared.')
    }
  }

  return (
    <div className="page settings-page">
      <PageHeading eyebrow="Preferences" title="Settings" />

      <section className="settings-section" aria-labelledby="settings-play-title">
        <div className="settings-section-heading"><h2 id="settings-play-title">Daily & play</h2></div>
        <div className="settings-controls">
          <label className="setting-control">
            <span><strong>Puzzle time zone</strong></span>
            <select aria-label="Puzzle time zone" value={state.settings.timeZone} onChange={(event) => void changePreference({ timeZone: event.target.value })}>
              {timeZones.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="setting-control">
            <span><strong>Default country catalogue</strong></span>
            <select aria-label="Default country catalogue" value={state.settings.catalogue} onChange={(event) => void changePreference({ catalogue: event.target.value as UserSettings['catalogue'] })}>
              <option value="standard">Standard · 195 states</option>
              <option value="extended">Extended · territories included</option>
            </select>
          </label>
        </div>
      </section>

      <section className="settings-section" aria-labelledby="settings-map-title">
        <div className="settings-section-heading"><h2 id="settings-map-title">Appearance & maps</h2></div>
        <div className="settings-controls">
          <label className="setting-control">
            <span><strong>Appearance</strong></span>
            <select aria-label="Appearance" value={state.settings.theme} onChange={(event) => void changePreference({ theme: event.target.value as UserSettings['theme'] })}>
              <option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option>
            </select>
          </label>
          <label className="setting-control setting-toggle-row">
            <span><strong>Show map labels</strong></span>
            <input className="toggle-input" type="checkbox" checked={state.settings.mapLabels} onChange={(event) => void changePreference({ mapLabels: event.target.checked })} />
          </label>
        </div>
      </section>

      <section className="settings-section data-settings" aria-labelledby="settings-data-title">
        <div className="settings-section-heading"><h2 id="settings-data-title">Progress & data</h2></div>
        <div className="settings-data-content">
          <div className="setting-actions">
            <button className="button button-outline" type="button" onClick={() => void downloadExport()}><Download size={16} aria-hidden="true" /> Export progress</button>
            <button className="button button-outline" type="button" onClick={() => fileInput.current?.click()}><Upload size={16} aria-hidden="true" /> Import backup</button>
            <input ref={fileInput} type="file" accept="application/json,.json" onChange={(event) => void readImport(event)} hidden />
            <button className="button button-text-danger" type="button" onClick={() => void clearProgress()}><RotateCcw size={15} aria-hidden="true" /> {confirmReset ? 'Confirm reset' : 'Reset saved data'}</button>
          </div>
          {confirmReset && <div className="reset-confirmation" role="alert">
            <div><strong>Reset all saved data?</strong><span>This removes results, active sessions, favorites and preferences from this browser.</span></div>
            <button className="button button-outline" type="button" onClick={() => setConfirmReset(false)}>Cancel</button>
            <button className="button button-danger" type="button" onClick={() => void clearProgress()}>Delete saved data</button>
          </div>}
          {(notice || error) && <div className={error ? 'form-message form-message-error' : 'form-message'} role={error ? 'alert' : 'status'}>{error || notice}</div>}
          <div className="storage-note"><HardDrive size={16} aria-hidden="true" /><span>Saved progress stays in this browser. <Link to="/privacy">Privacy details</Link></span></div>
        </div>
      </section>

      <section className="settings-section install-section" aria-labelledby="settings-offline-title">
        <div className="settings-section-heading"><h2 id="settings-offline-title">Offline & install</h2></div>
        <div className="install-note"><Info size={17} aria-hidden="true" /><span><strong>{offline ? 'Offline now.' : 'Offline support is ready.'}</strong> Previously opened maps and city data are cached here; first-time access needs a connection.</span></div>
      </section>
    </div>
  )
}
