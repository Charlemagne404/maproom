import { Component, type ErrorInfo, type PropsWithChildren, type ReactNode } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

interface ErrorBoundaryState {
  failed: boolean
}

export class ErrorBoundary extends Component<PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = { failed: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true }
  }

  componentDidCatch(error: Error, _info: ErrorInfo): void {
    console.error('Maproom could not render this page.', error)
  }

  render(): ReactNode {
    if (this.state.failed) {
      return (
        <main className="error-boundary-page">
          <div className="error-boundary-card">
            <AlertTriangle size={23} aria-hidden="true" />
            <span className="eyebrow">A map went astray</span>
            <h1>This page could not open.</h1>
            <p>Your saved progress remains in this browser. Reload the page or return to the daily puzzles.</p>
            <div className="result-actions">
              <button className="button button-dark" type="button" onClick={() => window.location.reload()}><RotateCcw size={15} /> Reload page</button>
              <a className="button button-outline" href="/">Return to Daily</a>
            </div>
          </div>
        </main>
      )
    }
    return this.props.children
  }
}
