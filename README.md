# Manuscript Lab

A private, browser-based XML-to-PDF publishing pipeline prototype. Load the page, paste a JATS-like `<article>` document or use the sample, choose a template and validation mode, then run the pipeline.

The page parses XML, exports LaTeX, checks required content, and generates a real downloadable PDF proof with the bundled pdf-lib library. The TeX compilation stage is explicitly simulated because a static hosted site cannot execute a TeX distribution. The browser PDF and exported LaTeX are separate renderings and may differ in line breaks and typography.

XML and generated artifacts stay in the active browser tab. No application endpoints, analytics, remote fonts, or file uploads are used. The XML parser rejects DTD and entity declarations. The prototype supports article title, authors, abstract, sections, paragraphs, lists, and references; other structures are reported where known and may be omitted from the PDF proof.

To serve locally: `python3 -m http.server 8765 -d dist`.

## Live demo

[Open the Manuscript Lab demo](https://manuscript-lab-balaji.balajicm.chatgpt.site)

The demo is privately hosted and available to its authorized owner.

## Public repository note

The public source uses the pinned `pdf-lib` CDN script in `dist/index.html` to avoid committing a vendored third-party bundle. The private hosted version bundles the same library locally. No manuscript data is sent to the CDN.
