# Feitewen - Project TODO List

## Content Display & Layout

### Article Cards
- [ ] Fix card content to display: Topic, Headline, Date, and Excerpt
- [ ] Remove "Why It Matters" from article cards
- [ ] Add cover image to cards (pulled from Notion database)
  - [ ] Create new "Cover Image" property in Notion database

### Homepage Sections
- [ ] Change "Latest News" to "Featured"
- [ ] Display only the latest three stories in Featured section (based on publish date)
- [ ] Add topic-specific sections after Featured (Politics, Crime, Economics, etc.)
- [ ] Each topic section should have its own heading

### Article Page
- [ ] Remove "Why It Matters" section from article pages
- [ ] Add "Read More" section showing three recent articles from the same topic
- [ ] Fix video embeds from Notion (currently not working on frontend)

## Styling & Design
- [ ] Fix mobile view
- [ ] Add colour to article tags (pull colours from Notion database)
  - [ ] Create new property in Notion database for tag colours
- [ ] Add Feitewen logo
- [ ] Add favicon for Feitewen

## Technical Issues
- [ ] Fix long article content being cut off after certain character limit
  - Current issue: 2000 character limit
  - Solution: Serve text in chunks
- [ ] Fix cache errors on Cloudflare

## Future Enhancements
- [ ] Build "Featured" function (currently just showing latest by date)

---

_Last updated: 2026-01-08_
