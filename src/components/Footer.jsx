import { isStaticBuild } from '../api/client'

export default function Footer() {
  if (!isStaticBuild) return null

  return (
    <footer className="border-t border-hairline bg-surface px-4 py-3 text-center sm:px-6">
      <p className="text-xs text-muted">
        Demo build: serves precomputed output of the matching and scoring engine. Live API and tests are in the repository.
      </p>
    </footer>
  )
}
