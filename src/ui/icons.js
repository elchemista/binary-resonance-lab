const paths = {
  wave: 'M2 12h4l3-8 4 16 3-13 2 5h4',
  cube: 'm12 2 9 5v10l-9 5-9-5V7z M3 7l9 5 9-5 M12 12v10',
  sliders: 'M3 6h6m4 0h8M3 12h12m4 0h2M3 18h3m4 0h11 M9 3v6m6 0v6m-9 0v6',
  scan: 'M3 17l5-7 4 3 7-9 M15 4h4v4 M3 21h18',
  play: 'm8 5 11 7-11 7z',
  pause: 'M8 5v14M16 5v14',
  step: 'm5 6 10 6-10 6z M19 5v14',
  reset: 'M3 10a9 9 0 1 1 2 8 M3 4v6h6',
  download: 'M12 3v12m-5-5 5 5 5-5 M4 16v4h16v-4',
  upload: 'M12 16V4m-5 5 5-5 5 5 M4 16v4h16v-4',
  surface: 'M3 3h18v18H3z M3 9h18M3 15h18M9 3v18M15 3v18',
  expand: 'M3 9V3h6m6 0h6v6m0 6v6h-6m-6 0H3v-6',
  chip: 'M6 6h12v12H6z M9 2v4m6-4v4M9 18v4m6-4v4M2 9h4m-4 6h4m12-6h4m-4 6h4',
  orbit: 'M18 5c5 1 4 6-1 10S5 21 3 18s1-8 6-11 7-3 9-2z M12 12h.01',
  layers: 'm12 2 10 6-10 6L2 8z M2 12l10 6 10-6 M2 16l10 6 10-6',
  cross: 'M12 2v20M2 12h20',
  plus: 'M12 5v14M5 12h14',
  bin: 'M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15',
  save: 'M3 3h15l3 3v15H3z M7 3v7h9V3 M7 21v-7h10v7',
  activity: 'M2 12h5l3-8 4 16 3-8h5',
  clock: 'M12 3a9 9 0 1 0 .01 0 M12 7v6l4 2',
}
export function icon(key) {
  return (
    '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="' +
    paths[key] +
    '"/></svg>'
  )
}
