---
# Sources: html/Work/tripsite.html:77-82, :88-110, :138-147, :155-165, :172-184, :192-205, :213-226, :234-244, :252-262; public/files/Resume_General.pdf (Trip Planner)
title: Trip Planner
summary: A team-built React trip planner for CSU's CS 314, developed under CMMI on an existing codebase, with database search, cross-team interoperability and trip optimization.
role: Team project
year: 2021
period: Fall 2021
group: software
featured: true
order: 4
capabilities: [engineering-practice]
stack: [React, Reactstrap, GitHub, ZenHub, Code Climate, SCRUM]
highlights:
  - 'Our team applied CMMI: configuration and change management, baselines, record keeping, integrity and maintainability audits, and peer evaluation.'
  - Database search that queries efficiently and filters results by place type and country.
  - A front end that follows shared protocols to work with any team's back end, demonstrated against another team's server.
  - My team went above and beyond with browser storage that keeps loaded trips and download preferences.
  - Traveling Salesman trip optimization, built against the requirement to optimize any size trip in under a second.
cover: ./cover.webp
coverAlt: Trip Planner map in the T22 2 Eazy app, with a multi-stop trip drawn in blue lines across the world and a place pop-up.
media:
  - kind: video
    src: ./full-demo.mp4
    alt: 'Screen recording of the Trip Planner: searching places, building a multi-stop world trip, filtering by country, and saving the trip.'
    caption: Full demo of the planner's functionality (recording sped up 2×).
    autoplay: false
  - kind: video
    src: ./iterative-design.mp4
    alt: Screen recording of adding Fort Collins places to a trip, server logs and a Git branch checkout in a terminal, and the trip redrawn on the map.
    caption: Iterative design — most changes came from “customer” feature requests and from external UX testers.
    autoplay: false
  - kind: video
    src: ./database-search.mp4
    alt: Screen recording of Find Place searches, then filtering results by type (airport, heliport, balloonport) and by country.
    caption: Querying the database efficiently and applying filters to the query.
    autoplay: false
  - kind: video
    src: ./interoperability.mp4
    alt: The Server Connection dialog switching from the t22 2 Eazy server to t23 Stuck in Beta; the footer then confirms the new connection.
    caption: My team's front end connecting to another team's back end, following the shared protocol.
    autoplay: true
  - kind: image
    src: ./trip-manager.webp
    alt: Trip Manager dialog listing saved trips (lakes.json, christmas_2020.json, my_vacation.json) with Load Trip, Save Trip and JSON, CSV, SVG options.
    caption: Saving and loading trips. Browser storage also retains loaded trips and download preferences.
  - kind: video
    src: ./tour-optimization.mp4
    alt: A tangled world trip is optimized into a single loop, and the trip total drops from 636,462 mi to 86,942 mi.
    caption: Traveling Salesman optimization, required to handle any size trip in under a second.
    autoplay: true
legacyPaths: [html/Work/tripsite.html]
---

## Problem

In CSU's CS 314, teams worked on an existing codebase to build a trip-planning website, with Capability Maturity Model Integration (CMMI) governing the development process. The requirements went beyond features: every team's front end had to work with every other team's back end, and trip optimization had to handle any size trip in under a second.

## Approach

We ran the project under CMMI — configuration and change management, development and release of baselines, record keeping, integrity and maintainability audits, integration strategies, design evaluation and peer evaluation — alongside SCRUM, GitHub, ZenHub and Code Climate.

Design was iterative for the whole semester. Most changes came from feedback in two forms: "customer" demand for new features, which required UX adjustments to implement well, and external people who served as our UX testers.

## What I built

With my team, on the existing codebase:

- **Database search.** Places come from a database, queried efficiently with filters applied to the query — one of the most rewarding parts of the project, because it put practical information in front of users.
- **Interoperability.** Each team followed shared protocols so any team's front end could work with any team's back end, and vice versa. The interoperability recording shows our front end connected to another team's back end.
- **Storage.** Users can save and load trips. We went above and beyond and added browser storage that keeps loaded trips and download preferences.
- **Trip optimization.** The classic Traveling Salesman problem, built against the requirement to optimize any size trip in under a second — good practice in testing and efficient resource usage.

## Outcome & lessons

Iterative design wasn't new to me, but applying it here demanded more forethought and accountability than my personal projects. Keeping the process consistent all semester built good habits, and it opened my team's eyes — and mine — to the sum of our incremental progress.
