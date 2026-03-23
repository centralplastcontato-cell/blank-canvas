

## Understanding

The v7 video is the "official" version (40s, clean audio). The final scene is the Celebrei logo/closing (shown in the uploaded screenshot). You want to insert **2 new platform scenes** before that closing scene, following the same dark/professional style as the existing scenes (CRM dashboard, WhatsApp bot, analytics, etc.).

## Plan

1. **Generate 2 new platform images** matching the existing style (dark UI, professional SaaS screenshots):
   - **Image 1: Agenda/Calendar view** — showing the event management calendar with colorful events, similar to `agenda-view.jpg`
   - **Image 2: Lead Kanban board** — showing the sales pipeline with cards in columns (Novo → Visita → Fechado), a key platform feature

2. **Reconstruct the video using ffmpeg:**
   - Take v7 video (40s total)
   - Split at ~30s mark (before the closing logo scene, which runs ~30s–40s)
   - Insert the 2 new images as ~3.5s clips each between the last platform scene and the closing logo
   - Re-apply the clean audio track
   - Total duration stays ~47s (or we compress timing to keep ~40s)

3. **Output:** `celebrei-promo-v10.mp4` with the clean v7 audio and enhanced visual sequence

## Technical Details

- Extract first ~30s of v7 video (platform scenes)
- Generate 2 new images via AI image generation to `src/assets/video/`
- Convert each to ~3.5s video clips at 30fps, 1920x1080
- Extract the closing logo scene (~30s–40s) from v7
- Concatenate: [first 30s] + [new scene 1] + [new scene 2] + [closing logo scene]
- Mix with the existing clean audio, extending it if needed

