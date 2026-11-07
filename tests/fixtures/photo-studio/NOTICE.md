# Photo Studio — preview QA photographs

These two photographs are test fixtures, copied byte-for-byte from the locally
prepared validation set. They are not private photographs of LRF, its customers,
or its users. Their authors published the source files on Wikimedia Commons
under the Creative Commons licences identified below. These licences permit
public copying and display with attribution and the stated conditions. The
licences of these images do not change the licence of the surrounding code.

The production public-site builder excludes `tests/`. The preview-only QA
harness may copy this folder, including this notice, into `__photo-studio-qa`.
Do not add these fixtures to the normal Photo Studio welcome screen or imply
that the fixtures are users' uploaded photographs.

## `room.jpg`

- Original title: **Empty apartment room with extension cord.jpg**.
- Photographer: **aismallard** (Wikimedia user Aismallard).
- Source: https://commons.wikimedia.org/wiki/File:Empty_apartment_room_with_extension_cord.jpg
- Licence: **Creative Commons Attribution-ShareAlike 3.0 Unported**,
  https://creativecommons.org/licenses/by-sa/3.0/
- Preparation: downloaded Wikimedia's 1920-pixel thumbnail, converted to RGB,
  re-encoded as JPEG at quality 92, with EXIF metadata removed. No crop, added
  objects, generated content, or other content retouching. Fixture copied
  unchanged from `qa-photos/15-commons.jpg`.
- Fixture: 1920 × 1440 pixels; SHA-256
  `5d5ae6296d64b00d0a73d3d725be4b36007a360790e6eb5e55f91537c9831f7c`.

This prepared image is distributed under CC BY-SA 3.0. A screenshot or exported
simulation incorporating an adapted version of the photograph must retain
attribution, identify the changes, and follow the ShareAlike terms for the
adapted image.

Suggested caption for a distributed simulation or screenshot:

> Room photograph: “Empty apartment room with extension cord.jpg” by aismallard,
> CC BY-SA 3.0, via Wikimedia Commons. Resized and re-encoded; simulated floor
> added by LRF PHOTO STUDIO. Adapted image: CC BY-SA 3.0.

Include the source and licence links with that caption.

## `no-floor.jpg`

- Original title: **Cozy living room with a gray sofa.jpg**.
- Author credited on the source page: **Shixart1985**.
- Source: https://commons.wikimedia.org/wiki/File:Cozy_living_room_with_a_gray_sofa.jpg
- Licence: **Creative Commons Attribution 2.0 Generic**,
  https://creativecommons.org/licenses/by/2.0/
- Preparation: downloaded Wikimedia's 1920-pixel thumbnail, converted to RGB,
  re-encoded as JPEG at quality 92, with EXIF metadata removed. Then retained
  only the top 35% of the prepared photograph, using integer pixel height, and
  re-encoded the crop as JPEG at quality 92. No added objects or generated
  content. Fixture copied unchanged from
  `qa-photos/16-no-floor-photo-crop.jpg`.
- Fixture: 1920 × 446 pixels; SHA-256
  `e3b6dafa55bfc245e621910e34b1eb5e6e39b139106d4ca42779d43b26831f8a`.

The crop contains a window, wall, and the top of a sofa; no floor is visible.
It is a negative segmentation input, not a prepared floor mask.

Suggested caption for a distributed screenshot:

> Photograph: “Cozy living room with a gray sofa.jpg” by Shixart1985,
> CC BY 2.0, via Wikimedia Commons. Resized, re-encoded, and cropped to the top
> 35% to form a no-floor test image.

Include the source and licence links with that caption. Neither photographer
endorses LRF PHOTO STUDIO.
