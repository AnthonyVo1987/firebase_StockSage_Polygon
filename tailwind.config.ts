import type {Config} from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: { 
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        body: ['Inter', 'sans-serif'],
        headline: ['Inter', 'sans-serif'],
        code: ['monospace', 'monospace'],
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
      // Add typography plugin for ReactMarkdown
      typography: ({ theme }: { theme: Function }) => ({
        DEFAULT: {
          css: {
            '--tw-prose-body': theme('colors.foreground / 1'),
            '--tw-prose-headings': theme('colors.foreground / 1'),
            '--tw-prose-lead': theme('colors.foreground / 1'),
            '--tw-prose-links': theme('colors.primary / 1'),
            '--tw-prose-bold': theme('colors.foreground / 1'),
            '--tw-prose-counters': theme('colors.muted.foreground / 1'),
            '--tw-prose-bullets': theme('colors.muted.foreground / 1'),
            '--tw-prose-hr': theme('colors.border / 1'),
            '--tw-prose-quotes': theme('colors.foreground / 1'),
            '--tw-prose-quote-borders': theme('colors.primary / 1'),
            '--tw-prose-captions': theme('colors.muted.foreground / 1'),
            '--tw-prose-code': theme('colors.foreground / 1'),
            '--tw-prose-pre-code': theme('colors.foreground / 1'),
            '--tw-prose-pre-bg': theme('colors.muted / 1'),
            '--tw-prose-th-borders': theme('colors.border / 1'),
            '--tw-prose-td-borders': theme('colors.border / 1'),
            '--tw-prose-invert-body': theme('colors.background / 1'),
            '--tw-prose-invert-headings': theme('colors.background / 1'),
            '--tw-prose-invert-lead': theme('colors.background / 1'),
            '--tw-prose-invert-links': theme('colors.primary / 1'),
            '--tw-prose-invert-bold': theme('colors.background / 1'),
            '--tw-prose-invert-counters': theme('colors.muted.DEFAULT / 1'),
            '--tw-prose-invert-bullets': theme('colors.muted.DEFAULT / 1'),
            '--tw-prose-invert-hr': theme('colors.border / 1'),
            '--tw-prose-invert-quotes': theme('colors.background / 1'),
            '--tw-prose-invert-quote-borders': theme('colors.primary / 1'),
            '--tw-prose-invert-captions': theme('colors.muted.DEFAULT / 1'),
            '--tw-prose-invert-code': theme('colors.background / 1'),
            '--tw-prose-invert-pre-code': theme('colors.muted.foreground / 1'),
            '--tw-prose-invert-pre-bg': theme('colors.muted / 0.5'),
            '--tw-prose-invert-th-borders': theme('colors.border / 1'),
            '--tw-prose-invert-td-borders': theme('colors.border / 1'),
             p: { marginTop: '0.5em', marginBottom: '0.5em' }, // Tighter paragraph spacing
             'ul, ol': { marginTop: '0.5em', marginBottom: '0.5em' },
             li: { marginTop: '0.125em', marginBottom: '0.125em' },
             h2: { marginTop: '0.75em', marginBottom: '0.25em' },
             h3: { marginTop: '0.6em', marginBottom: '0.2em' },
             code: { 
                backgroundColor: theme('colors.muted.DEFAULT / 0.7'),
                padding: '0.2em 0.4em',
                margin: '0',
                fontSize: '85%',
                borderRadius: '0.25rem',
                color: theme('colors.foreground / 1'),
             },
            'code::before': { content: 'none' }, // Remove backticks from inline code
            'code::after': { content: 'none' },  // Remove backticks from inline code
            pre: {
                color: theme('colors.foreground / 1'),
                backgroundColor: theme('colors.muted.DEFAULT / 0.7'),
                marginTop: '1em',
                marginBottom: '1em',
                padding: '0.75em',
                borderRadius: '0.375rem',
                overflowX: 'auto',
            },
            'pre code': { // Target code blocks within pre specifically for no background/padding
                backgroundColor: 'transparent',
                padding: '0',
                color: 'inherit', // Inherit color from pre
            },
          },
        },
        // Custom prose for primary user messages if needed
        'primary-user': {
          css: {
            '--tw-prose-body': theme('colors.primary.foreground / 1'),
            '--tw-prose-headings': theme('colors.primary.foreground / 1'),
            '--tw-prose-bold': theme('colors.primary.foreground / 1'),
            '--tw-prose-links': theme('colors.primary.foreground / 0.8'),
            '--tw-prose-code': theme('colors.primary.foreground / 0.9'),
            '--tw-prose-bullets': theme('colors.primary.foreground / 0.9'),
            '--tw-prose-invert-body': theme('colors.primary.foreground / 1'), // for consistency if .dark is on parent
            '--tw-prose-invert-headings': theme('colors.primary.foreground / 1'),
            '--tw-prose-invert-bold': theme('colors.primary.foreground / 1'),
             p: { color: theme('colors.primary.foreground / 1') },
             strong: { color: theme('colors.primary.foreground / 1') },
          },
        },
      }),
    },
  },
  plugins: [
    require('tailwindcss-animate'),
    require('@tailwindcss/typography'),
  ],
} satisfies Config;
