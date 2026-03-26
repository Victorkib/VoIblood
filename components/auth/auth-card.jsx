export function AuthCard({ title, description, children, footerText, footerLink }) {
  return (
    <div className="w-full max-w-sm">
      <div className="rounded-lg border border-border bg-card p-8 shadow-sm">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">{title}</h1>
          <p className="text-sm text-foreground/60">{description}</p>
        </div>

        {/* Content */}
        <div className="mb-6">
          {children}
        </div>

        {/* Footer */}
        {footerText && footerLink && (
          <div className="border-t border-border pt-6 text-center">
            <p className="text-sm text-foreground/60">
              {footerText}{' '}
              {footerLink}
            </p>
          </div>
        )}
      </div>

      {/* Security Info */}
      <div className="mt-6 text-center">
        <p className="text-xs text-foreground/50">
          🔒 Your data is encrypted and secure
        </p>
      </div>
    </div>
  )
}
