/**
 * Tailwind CSS preset for Tracky registry components (Tailwind v3).
 *
 * Add it to the consumer's Tailwind config and import `tokens.css` once in
 * the application stylesheet. Tailwind v4 consumers use the `@theme inline`
 * block documented in this directory instead.
 */
module.exports = {
  theme: {
    extend: {
      colors: {
        background: 'var(--tracky-background)',
        foreground: 'var(--tracky-foreground)',
        primary: {
          DEFAULT: 'var(--tracky-primary)',
          foreground: 'var(--tracky-primary-foreground)',
          hover: 'var(--tracky-primary-hover)',
        },
        secondary: {
          DEFAULT: 'var(--tracky-secondary)',
          foreground: 'var(--tracky-secondary-foreground)',
          hover: 'var(--tracky-secondary-hover)',
        },
        muted: {
          DEFAULT: 'var(--tracky-muted)',
          foreground: 'var(--tracky-muted-foreground)',
        },
        destructive: {
          DEFAULT: 'var(--tracky-destructive)',
          foreground: 'var(--tracky-destructive-foreground)',
          hover: 'var(--tracky-destructive-hover)',
        },
        border: 'var(--tracky-border)',
        ring: 'var(--tracky-ring)',
        'switch-thumb': 'var(--tracky-switch-thumb)',
      },
      borderRadius: {
        sm: 'var(--tracky-radius-sm)',
        md: 'var(--tracky-radius-md)',
        lg: 'var(--tracky-radius-lg)',
      },
      fontFamily: {
        sans: ['var(--tracky-font-sans)'],
      },
    },
  },
}
