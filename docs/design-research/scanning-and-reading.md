# How visitors scan and read

## TL;DR: rules

1. **Assume ~20% of the words get read.** Cut word count first; every sentence competes with
   the images.
2. **Most important point first**, in the first two paragraphs of a page and the first
   sentence of a block, and in the **first two words** of a heading.
3. **Headings carry the page.** Make them visually distinct and information-bearing, so a
   visitor who reads only the headings still gets the story (the "layer-cake" scan).
4. **Chunk.** Short paragraphs, bullets for lists, related content grouped in a visible region
   (border, background, or whitespace), and text placed next to the visual it describes.
5. **Give the eye anchors.** Bold key phrases and use descriptive link text. Never use "click
   here" or "read more".
6. **Delete what doesn't earn its place.** Superfluous content lowers the share of important
   content that gets seen.

## Evidence

### How little users read ([NN/g, "How Little Do Users Read?"][little])

Log data from 45,237 page views (average page 593 words):

- Users have time to read **at most 28%** of the words on an average page; **~20%** is more
  likely.
- Users read about half the text only on pages of **≤111 words**.
- Each extra 100 words adds only **~4.4 s** of time on page (≈18 words actually read), on top
  of a fixed ~25 s spent orienting.
- NN/g's advice: "put your word count on a strict diet."

### The four scanning patterns ([NN/g, "Text Scanning Patterns"][patterns])

| Pattern        | What the eye does                                             | Triggered by                                                     | Outcome                                              |
| -------------- | ------------------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------- |
| **F-pattern**  | Reads the top, a shorter second line, then the left edge down | Walls of text with no headings, bullets, or bold                 | Worst: misses whole chunks based on layout alone     |
| **Spotted**    | Jumps to visually distinct words (links, bold, numbers)       | Distinct styling, or words matching what the user wants          | OK if the styled words are the important ones        |
| **Layer-cake** | Reads headings and subheadings, dips into body occasionally   | Visually distinct, descriptive headings                          | **Most effective scan**; users find what they need   |
| **Commitment** | Reads nearly everything                                       | High motivation (known source, loyalty, belief the page is best) | Best comprehension, rarest; don't design assuming it |

### Avoiding the F-pattern ([NN/g, "F-Shaped Pattern"][f])

The F-pattern happens when three things coincide: unformatted text, a user optimising for
speed, and low motivation. A casual portfolio visitor matches the second and third by
default, so the only lever is formatting. NN/g's fixes:

1. Put the most important points in the **first two paragraphs**.
2. Use headings and subheadings with prominent visual treatment.
3. Start headings with **information-bearing words** (the first two words should convey
   meaning).
4. Visually group related content with borders or background colour.
5. **Bold** important words and phrases.
6. Use formatted links with information-rich anchor text.
7. Use bullets and numbers for lists and steps.
8. Remove unnecessary content.

### Writing headings for the layer-cake scan ([NN/g, "Layer-Cake Pattern"][cake])

- Styling: differ from body text by size, weight, colour, or typeface. But **not so loud they
  read as ads**, because users ignore those.
- Wording: describe **all and only** what's in the section; front-load the important words;
  plain language over clever or broad labels.
- Order the content first, then refine the headings.
- Mixed content (cards, images): group similar items physically, separate groups with
  borders/backgrounds/whitespace, label each group, and put text **closest to the visual it
  belongs to** (Gestalt proximity).

## Applying it here

- **Project card copy** (`summary` in frontmatter; rendered by `src/components/ProjectCard.astro`):
  lead with what the thing _is_ and the most impressive concrete fact. Keep it to 2–3 short
  sentences. The card's image does the rest.
- **Case studies** (`src/layouts/ProjectLayout.astro`, body under `src/content/projects/`):
  the header block (summary, highlights, meta, cover) must stand alone for someone who reads
  nothing else. `highlights` are the spotted-pattern anchors, so make each a short, concrete
  fact. Section headings (`## Problem`, `## Approach`, …) are generic; the first sentence
  under each must carry the point.
- **Home page sections** (`src/pages/index.astro`): each `SectionHeading` label plus the
  visual under it should convey the section with zero body reading.
- **Link text**: descriptive (`All work →`, project titles), never "click here" or "read
  more".
- Still fact-only: shorter and sharper copy, never embellished copy.

[little]: https://www.nngroup.com/articles/how-little-do-users-read/
[patterns]: https://www.nngroup.com/articles/text-scanning-patterns-eyetracking/
[f]: https://www.nngroup.com/articles/f-shaped-pattern-reading-web-content/
[cake]: https://www.nngroup.com/articles/layer-cake-pattern-scanning/
