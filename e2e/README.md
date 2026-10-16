# E2E checks (Playwright)

Standalone scripts (Playwright is not a project dependency):

```bash
npm i -D playwright && npx playwright install chromium   # once, or in a scratch dir
URL=http://localhost:4300/ node e2e/flow-studio.e2e.mjs   # Flow Studio: drag/add, connect, configure, run, guide, templates, DE/EN, 375 + 1440
URL=http://localhost:4300/ node e2e/responsive.e2e.mjs    # 320–1920 px, no overflow / console errors
```

`URL` may point to the live site (`https://z6bzsmgh5g-lgtm.github.io/cyulater-website/`). Screenshots go to `$SHOTS` (default `/workspace/screenshots`).
