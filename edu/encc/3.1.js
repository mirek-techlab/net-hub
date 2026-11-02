// edu/encc/3.1.js — EXAMPLE / SKELETON ONLY (placeholder text, no study content).
// Format: README.md › "Edu topic files". Replace the placeholders with the finished notes.
eduTopic('encc', '3.1', {
  updated: 'YYYY-MM-DD',
  summary: '<one sentence: what this topic is about>',

  // Markdown: "## " headings, "-" bullets, `inline code`, ``` code blocks, links.
  // Markers: [documented] = stated in a source, [derived] = own conclusion / tested in practice.
  // [1], [2] … refer to the sources below (same id).
  body: `
## <section heading>
<explanation goes here> [documented][1]

- <point> [derived]
- <point> [documented][2]

## <another section>
<explanation goes here>
`,

  sources: [
    { id: 1, title: '<vendor document title — chapter>', url: 'https://example.com/replace-me' },
    { id: 2, title: '<second source>', url: 'https://example.com/replace-me-too' },
  ],

  // Go into the command registry → cheat sheets, Ctrl+K search, mind map (under this Edu domain page).
  commands: [
    { cmd: '<command with <placeholders>>', d: '<what it shows / does>', tags: ['edu-example'], k: '<how you would remember the problem>', grp: 'verify', lang: 'IOS XE' },
  ],

  // Optional: extra NET_HUB pages related to this topic (route ids).
  links: ['cisco/vpn/case-partner'],
});
