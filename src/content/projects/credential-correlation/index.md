---
# Sources: html/Work/credential_correlation.html:77-79, :86-107, :115-118, :130, :136-144, :150-159, :167-181, :186, :190
title: Credential Correlation Visualizer
summary: Scores how strongly a password correlates with its username, to show users a risk that online password-strength checkers miss.
tldr: 'I built a tool that scores how much a password gives away about its username. Online checkers grade a password alone, so one that just repeats the username can still rate "Strong". It uses machine learning and about 120 million real credentials I compiled.'
year: 2023
group: security
featured: true
order: 2
capabilities: [data-ml, offensive-security]
stack: [Python, tkinter, Hadoop MapReduce, Apache Spark, Machine learning]
highlights:
  - Compiled ~120,000,000 real-world credentials from various sources, then cleaned and formatted them into a dataset.
  - Featurized the credentials with custom algorithms and processed them on a cluster with Hadoop MapReduce and Apache Spark.
  - Applied machine learning to score how strongly a password correlates with its username.
  - Built a tkinter GUI that marks every pattern, number and character a username and password share.
cover: ./cover.webp
coverAlt: The visualizer comparing Green86Boot! with Boot19Green86!, arrows labeling each pattern, number and character the two share.
coverPosition: 'center top'
media:
  - kind: image
    src: ./password-checker-search.webp
    alt: "Search results for “password checker”: security.org's How Secure Is My Password? and passwordmonster.com's Password Strength Meter."
    caption: A simple “password checker” search is the first trap for inexperienced users.
  - kind: image
    src: ./dummy-credentials.webp
    alt: 'Dummy credential pair: username (:pjackim.1234@gmail.com with password (:pjackim.1234.'
    caption: Dummy credentials — the password simply repeats the username.
  - kind: image
    src: ./checker-rated-strong.webp
    alt: An online strength checker rates the password (:pjackim.1234 “Strong”, with a time to crack of 1 year.
    caption: The trap — the checker grades the password on its own.
  - kind: image
    src: ./checker-crack-time.webp
    alt: How Secure Is My Password? estimates a computer would need about 53 million years to crack (:pjackim.1234.
    caption: A second checker calls the same password secure, even though it matches the username.
  - kind: image
    src: ./gui-visualizer.webp
    alt: The tkinter visualizer comparing Green86Boot! and Boot19Green86!, colored arrows marking each shared pattern, number and character.
    caption: Correlation matters — the visualizer shows exactly what a password gives away about its username.
    wide: true
  - kind: youtube
    id: 'klYKJ2U_WKk'
    title: Credential Correlation Visualizer demo
legacyPaths: [html/Work/credential_correlation.html]
---

## Problem

People often judge an account's security by checking how strong its password is, and a simple "password checker" search is the first trap for inexperienced users. I tested a password that simply repeated its username: one online checker rated it "Strong", and another estimated it would take a computer about 53 million years to crack. Tools like these grade the password in isolation, so they tell users that credentials like these are secure.

## Approach

Measure the correlation between the username and the password directly. Showing users what their password gives away about their username helps them shed the biases they bring to creating credentials.

## What I built

- **Dataset.** About 120,000,000 real-world credentials, compiled from various sources, then cleaned and formatted.
- **Features.** Custom algorithms to featurize every credential pair.
- **Big data.** Processing on a computing cluster with Hadoop MapReduce and Apache Spark.
- **Model.** Machine learning to score the correlation between a username and its password.
- **Visualizer.** A tkinter GUI where you enter a username and password and see every shared pattern, number, capital, lowercase and special character called out.
