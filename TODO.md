# Feitewen - Project TODO List

## Content Display & Layout

### Article Cards
- [x] Fix card content to display: Topic, Headline, Date, and Excerpt
- [x] Remove "Why It Matters" from article cards
- [x] Add cover image to cards (pulled from Notion database)
  - [x] Create new "Cover Image" property in Notion database (or use page cover)

### Homepage Sections
- [x] Change "Latest News" to "Featured"
- [x] Display only the latest three stories in Featured section (based on publish date)
- [x] Add topic-specific sections after Featured (Politics, Crime, Economics, etc.)
- [x] Each topic section should have its own heading

### Article Page
- [x] Remove "Why It Matters" section from article pages
- [ ] Add "Read More" section showing three recent articles from the same topic
- [ ] Fix video embeds from Notion (currently not working on frontend)

## Styling & Design
- [x] Fix mobile view
- [x] Add colour to article tags
  - **IMPLEMENTED**: Each topic has a unique pastel color
- [ ] Add Feitewen logo
- [ ] Add favicon for Feitewen

## Technical Issues
- [x] Fix long article content being cut off after certain character limit
  - ~~Current issue: 2000 character limit~~
  - ~~Solution: Serve text in chunks~~
  - **FIXED**: Added block pagination to fetch all content
- [x] Fix cache errors on Cloudflare
  - **FIXED**: Cache now uses proper URLs, TTL increased to 1 hour

## Future Enhancements
- [ ] Build "Featured" function (currently just showing latest by date)

---

_Last updated: 2026-01-08_
