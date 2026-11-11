# Credits

The deck text and the CSS were written for this repository and are under the MIT licence in the repo root.

The three pictures are public-domain films. Each was taken from the Wikimedia Commons file named below, checked against that file’s structured licence data (`LicenseShortName: Public domain`, `Copyrighted: False`), then trimmed and padded to 1280×720 H.264. Durations below are the files in `assets/`.

## L’Arrivée d’un train en gare de La Ciotat

- Title: Arrival of a Train at La Ciotat
- Year: filmed around 1895 and shown in 1896. The Commons file title says 1895.
- Maker: Auguste and Louis Lumière
- Source: [File:Arrival of a Train at La Ciotat (The Lumière Brothers, 1895).webm](https://commons.wikimedia.org/wiki/File:Arrival_of_a_Train_at_La_Ciotat_(The_Lumi%C3%A8re_Brothers,_1895).webm)
- Direct file used: `https://upload.wikimedia.org/wikipedia/commons/1/1a/Arrival_of_a_Train_at_La_Ciotat_%28The_Lumi%C3%A8re_Brothers%2C_1895%29.webm`
- Licence: public domain (Wikimedia Commons)
- Trim: the whole picture, 0:00.000–0:49.049 of that file. Shipped length 49.0 s.
- Audio: the Commons encode includes a later stereo score. That score was removed. `assets/train.mp4` is picture only.
- Output: `assets/train.mp4` (1280×720, H.264, no audio track)

## Le Voyage dans la Lune

- Title: A Trip to the Moon (Le Voyage dans la Lune)
- Year: 1902
- Maker: Georges Méliès
- Source: [File:Le Voyage dans la Lune (1902).webm](https://commons.wikimedia.org/wiki/File:Le_Voyage_dans_la_Lune_(1902).webm)
- Encode used: the Commons 720p VP9 transcode of that file (`…webm.720p.vp9.webm`), which is picture only
- Licence: public domain (Wikimedia Commons). Méliès died in 1938; the film was published in 1902.
- Trim: 0:05:40.000–0:07:10.000 of the 12:46 transcode (the cannon’s launch through the moon’s face). Shipped length 90.0 s.
- Output: `assets/moon.mp4` (1280×720, H.264, no audio track)

## Steamboat Willie

- Title: Steamboat Willie
- Year: 1928 (the title card in the print reads MCMXXIX)
- Makers: Walt Disney and Ub Iwerks, with the artists named on the Commons file page
- Source: [File:Steamboat Willie (1928) by Walt Disney.webm](https://commons.wikimedia.org/wiki/File:Steamboat_Willie_(1928)_by_Walt_Disney.webm)
- Encode used: the Commons 720p VP9 transcode of that file, which includes the original mono soundtrack
- Licence: public domain. The Commons permission text says the work is in the public domain in the United States because it was published before 1 January 1931. This deck uses that 1928 film, not a later Disney production.
- Trim: 0:00:00.000–0:01:30.000 of the 7:40 transcode (title card and the opening of the picture). Shipped length 90.0 s.
- Audio: kept. `assets/willie.mp4` has one AAC channel taken from that soundtrack.
- Output: `assets/willie.mp4` (1280×720, H.264 + AAC)
