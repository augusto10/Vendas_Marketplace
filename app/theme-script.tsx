export function ThemeScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
try {
  const theme = localStorage.getItem('theme');
  if (theme !== 'light') document.documentElement.classList.add('dark');
} catch (_) {}
`
      }}
    />
  );
}
