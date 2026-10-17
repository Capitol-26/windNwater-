# WindNWater

## UI design rules

Every screen must follow the Figma design: https://www.figma.com/design/oiKrdllvBOMYTkS2a3OyHh/Untitled?node-id=0-1
Before building or changing UI, pull the relevant frame with the Figma MCP and match it.

- Ground: sand `#E7B573`; accents terracotta `#C36241` and sage `#7A8B7B`; text black on sand, white on blobs and buttons. Tokens live in `src/theme/colors.ts`.
- Type: Instrument Sans only, Regular and Medium (`typography` and `fonts` in `src/theme/typography.ts`). Titles 40, button labels 28, body 18. Button and action copy is lowercase ("click to scan").
- Every screen sits in `ScreenContainer` with a `variant` that places two organic blobs bleeding off the corners (shapes in `src/assets/blobs.ts`). Add a new variant there for new screens.
- Primary action: `Button` (290x63 terracotta pill, radius 27). Content sits in `ViewfinderFrame`: a narrow portrait camera-style window clipped to rounded corners, with only the four black corner brackets drawn (no full border).
- Icons: Phosphor (`phosphor-react-native`, bold weight). Screens with a previous screen get a `BackButton` (white circle, top-left).
- The app opens on `IntroScreen` (animation built with `react-native-reanimated`), which hands over to the camera. There is no home screen. Use Reanimated for animation.
- No cards, shadows or gradients. Keep screens sparse: one title, one focal frame, one action.
- The app has one feature: record a room walk-through, upload it to `server/`, show the AI feng shui rating. Do not add LiDAR, floor plans or other modes unless asked.
