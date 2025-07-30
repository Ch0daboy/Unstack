# Product Requirements Document: Online Course Generator

**Author:** Gemini

**Date:** 2025-07-26

**Version:** 1.0

---

## 1. Overview

The "Online Course Generator" is a new feature within Unstack that allows users to create comprehensive online courses from a simple prompt. For each chapter (or module), the feature will generate a blog article, a featured image, and a lesson plan. The lesson plan will include a script and text-to-speech audio, and will be exportable as a Google Slides presentation.

## 2. Problem Statement

Creating online courses is a time-consuming process that involves content creation, visual design, and lesson planning. Unstack can streamline this process by automating the generation of these materials, allowing creators to focus on delivering high-quality educational content.

## 3. Goals

- To provide users with a powerful tool for creating online courses.
- To reduce the time and effort required to create online course materials.
- To enhance the value of Unstack by adding a new, in-demand feature.

## 4. User Personas

- **Educators and Tutors:** Teachers and tutors who want to create online courses for their students.
- **Coaches and Consultants:** Professionals who want to share their expertise through online courses.
- **Content Creators:** YouTubers, bloggers, and other content creators who want to monetize their content by creating online courses.

## 5. User Stories

- As a user, I want to be able to select "Online Course Generator" as a genre when creating a new book.
- As a user, I want to be able to generate a blog article for each chapter of my online course.
- As a user, I want to be able to generate a featured image for each blog article.
- As a user, I want to be able to generate a lesson plan for each chapter of my online course.
- As a user, I want the lesson plan to include a script for a 15-20 minute presentation.
- As a user, I want to be able to generate text-to-speech audio for the lesson plan script.
- As a user, I want to be able to export the lesson plan as a Google Slides presentation.

## 6. Requirements

### Phase 1: Core Content Generation (Complete)

- [x] Add "Online Course Generator" to the list of available genres.
- [x] When "Online Course Generator" is selected, the AI should generate a course outline with modules instead of chapters.
- [x] For each module, the user should be able to generate a blog article.
- [x] For each module, the user should be able to generate a lesson plan in JSON format, with slides containing a title, content, and a script.

### Phase 2: Visuals and Audio (Complete)

- [x] For each blog article, the user should be able to generate a featured image.
- [x] For each lesson plan, the user should be able to generate text-to-speech audio for each slide's script.
- [x] The user should be able to play the generated audio for each slide.

### Phase 3: Google Slides Integration (To Be Implemented)

- [ ] The user should be able to authenticate their Google account to allow Unstack to create Google Slides presentations on their behalf.
- [ ] The user should be able to generate a Google Slides presentation from the lesson plan.
- [ ] The generated presentation should contain a title slide and a slide for each item in the lesson plan, with the title and content from the lesson plan.

## 7. Non-Functional Requirements

- **Performance:** The generation of content, images, and audio should be performed asynchronously to avoid blocking the UI.
- **Usability:** The user interface should be intuitive and easy to use.
- **Security:** User data, including API keys and Google account information, must be stored securely.

## 8. Assumptions and Dependencies

- The user will have a Google account and will be willing to grant Unstack permission to create Google Slides presentations.
- The user will have a Google Cloud project set up with the Google Slides API enabled.
- The user will provide their Google Cloud API key and client ID to the application.
