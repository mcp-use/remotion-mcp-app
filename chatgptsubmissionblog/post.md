---
title: "How to Deploy an MCP App on ChatGPT"
description: "A step-by-step walkthrough of submitting your MCP server to the ChatGPT App directory — from App Info to final review."
date: "2025-02-17"
---

# How to Deploy an MCP App on ChatGPT

OpenAI recently opened the ChatGPT App directory to MCP servers. If you've built an MCP app and want to make it available to millions of ChatGPT users, you'll need to go through their submission process on [platform.openai.com](https://platform.openai.com).

The process is a 6-step form: **App Info** → **MCP Server** → **Testing** → **Screenshots** → **Global** → **Submit**. Your draft auto-saves as you go, so you don't need to finish everything in one sitting.

This post walks through every step — with screenshots from our own submission of the [Video Generator](https://github.com/mcp-use/remotion-mcp-app) MCP app.

---

## Before You Start

A few things to have ready before you open the form:

- **Your MCP server must be deployed and publicly accessible.** Localhost won't work. The platform needs to reach your `/mcp` endpoint to scan tools and verify your domain.
- **Prepare a 64x64px SVG logo.** The form won't let you proceed past Step 1 without one.
- **Screenshots at exactly 706px wide** (min 400px tall). Non-compliant screenshots are a top rejection reason.
- **If submitting as a business**, complete OpenAI's business verification in your org settings first — otherwise you'll be blocked at the final step.

---

## Step 1 — Finding the Apps Section

Head to [platform.openai.com](https://platform.openai.com) and look for **ChatGPT Apps** in the left sidebar under "Manage." This is your apps dashboard — it lists all your existing apps and their review statuses.

Click **+ New App** in the top-right to start a new submission.

![Apps dashboard showing existing apps and the + New App button](./images/01-apps-list.png)

Once you click it, you're dropped into the multi-step submission form. The stepper at the top shows your progress across all six sections.

![New App blank form with the 6-step progress stepper](./images/02-new-app-blank.png)

---

## Step 2 — App Info

This is the most content-heavy step. Everything here will be publicly visible on your app's directory listing.

### Logo Icon

Upload a square SVG at **64x64px**. Don't add rounded corners or borders yourself — the platform applies circular cropping automatically. You can optionally add a dark mode variant.

This field is **required**. If you try to click Continue without uploading a logo, you'll get a validation error:

![Logo validation error — "This is a required field"](./images/07-app-info-logo-validation.png)

### Name, Subtitle & Description

Once the logo is uploaded, fill in the core identity fields:

- **App Name** — what users see in the directory. Keep it short and clear.
- **Subtitle** — a 30-character plain-language phrase describing what the app does. Avoid marketing speak. Think functional: *"Create animated videos with AI"*.
- **Description** — a longer paragraph (2-4 sentences) explaining what the user can actually do. Focus on the use case, not the technical implementation.

![App Info form filled in with name, subtitle, and description](./images/01-app-info-top.png)

### Category

Pick from the dropdown: Business, Collaboration, Design, Developer Tools, Education, Entertainment, Finance, Food, Lifestyle, Productivity, Shopping, or Travel. For a video creation tool, **Productivity** fits well.

![Category dropdown showing all available options](./images/04-app-info-category-dropdown.png)

### URLs & Contact Info

Scroll down and you'll find several URL fields:

- **Website URL** — your app's homepage or GitHub repo
- **Customer Support URL or Email** — a GitHub Issues page works fine for open-source projects
- **Privacy Policy URL** — required; linking to your LICENSE or a GitHub page is acceptable for an initial submission
- **Terms of Service URL** — can mirror your privacy policy for simpler projects
- **Demo Recording URL** — a video showing all major use cases across web, iOS, and Android. A real demo significantly helps your review, but you can use a placeholder link initially.

![URL fields and contact info section](./images/02-app-info-urls.png)

### Commerce

At the bottom of the App Info section there's a checkbox asking whether your app links users outside ChatGPT to make purchases. For most developer tools and open-source apps, leave this **unchecked**.

![Commerce checkbox at the bottom of App Info](./images/06-app-info-bottom-commerce.png)

---

## Step 3 — MCP Server

This is the technical heart of the submission.

### Server URL & Authentication

Enter the full URL to your running MCP server endpoint — this should end in `/mcp`. For example:

```
https://your-app.run.mcp-use.com/mcp
```

Then select your authentication method. Options include No Auth, OAuth, and others. For public servers with no authentication, select **No Auth**.

![MCP Server URL and Scan Tools button](./images/08-mcp-server-url-scan.png)

### Scanning Tools

Click **Scan Tools**. The platform connects to your server and automatically discovers all exposed tools. This takes a few seconds. When it completes, a "Tool justification" section appears.

### Tool Justifications

For every tool discovered on your server, you need to fill in three fields:

| Field | What to explain |
|-------|----------------|
| **Read Only** | Whether the tool only reads data or can write/modify things |
| **Open World** | Whether the tool can access external systems or data beyond the session |
| **Destructive** | Whether the tool can permanently alter or delete data |

One clear sentence per field is enough. Be accurate — reviewers use these to verify that the tool annotations in your MCP server code match reality.

![Tool justification fields for each discovered tool](./images/10-mcp-tool-justifications.png)

### Domain Verification

Below the tool justifications you'll see a domain verification section. It starts as **"Domain not verified"** in red. The platform generates a unique verification token and tells you exactly where to host it.

![Domain not verified — red status with verification token](./images/09-domain-verification.png)

The process:

1. Copy the verification token shown on screen
2. Serve it as plain text at `/.well-known/openai-apps` on your domain
3. Deploy or restart your server so the file is accessible
4. Come back and click **Verify Domain**

When it succeeds, the red message turns into a green **"Domain verified"** checkmark. This step is required — you cannot proceed without it.

![Domain verified — green checkmark](./images/11-domain-verified-success.png)

> **Tip:** Before clicking Verify, open `https://your-domain.com/.well-known/openai-apps` in a browser tab to confirm the token is actually being served.

---

## Step 4 — Testing

This step requires you to write test cases that OpenAI's review team will use to manually test your app. You need at least **5 positive** and **3 negative** test cases.

![Testing step overview](./images/12-testing-step.png)

### Positive Test Cases

These describe scenarios where your app should work correctly. Each case has four fields:

| Field | Example |
|-------|---------|
| **Scenario** | Create a simple animated title card video |
| **User prompt** | Create a video with a bold white title "Hello World" that fades in on a dark background |
| **Tool triggered** | `create_video` |
| **Expected output** | A rendered video player showing an animated title card with smooth fade-in effect |

### Negative Test Cases

These describe scenarios where the app should **not** trigger. They help reviewers understand the boundaries of your app. Good negative cases include requests that are out of scope or go beyond the app's capabilities.

For example: *"Search the web for video editing software"* or *"Export this video as an MP4 and download it."* For the Tool triggered field, put **None**.

![All positive and negative test cases filled in](./images/13-testing-cases-filled.png)

> **Tip:** Make sure each of your MCP tools appears in at least one positive test case. Cover your full surface area.

---

## Step 5 — Screenshots

Upload at least **1 screenshot** (up to 4). These appear on your app's public directory listing.

The requirements are strict:

- **Format:** PNG or JPG
- **Width:** exactly 706px
- **Minimum height:** 400px (recommended: 860px)
- Show only your app widget UI — no ChatGPT interface chrome
- No user prompts or AI responses baked into the image
- Avoid embedded text (OpenAI localizes apps for different regions)

OpenAI provides a public **Figma template** to help create compliant screenshots. Use it — non-compliant screenshots are one of the most common rejection reasons.

![Screenshot upload area](./images/16-screenshots-upload-area.png)

---

## Step 6 — Global

A short step with two settings:

**Translations** — English (US) is included by default. Add other locales if your app supports them.

**Allowed Countries** — defaults to "Allow all." Leave this unless you have geographic restrictions.

![Global step — translations and allowed countries](./images/17-global-step.png)

---

## Step 7 — Submit

The final step shows a preview of your app card — icon, name, and subtitle — exactly as it will appear in the directory.

![Submit step — app card preview and release notes](./images/18-submit-top.png)

### Release Notes

Write a short description of what this version does and its key features. For a first submission, just describe what the app is. This may be shown publicly.

### Policy Compliance

You'll need to confirm several checkboxes:

- You've reviewed and agree to OpenAI's Terms and App Submission Guidelines
- Your app is compliant with those terms
- Your app complies with all applicable laws and regulations
- Your app does not initiate financial transactions on behalf of users
- Your app does not serve advertisements
- You have the rights to all third-party content used
- Your app is not designed for children under 13
- Whether your app contains mature/adult content

Finally, select whether you're submitting as an **Individual** or a **Business**.

![Policy compliance checkboxes and individual/business selection](./images/19-submit-policy-dropdown.png)

Once everything is checked, click **Submit for Review**. Your app enters OpenAI's manual review queue. Submitting doesn't guarantee listing — it goes through a review process.

![Submit for Review button](./images/20-submit-for-review-final.png)

---

## Wrapping Up

The submission process is straightforward but detail-oriented. The most common blockers are:

1. **Missing logo** — have your 64x64 SVG ready before you start
2. **Domain verification failing** — double-check that the token file is being served at the exact path
3. **Screenshot rejections** — use the Figma template and respect the 706px width requirement
4. **Incomplete test cases** — cover all your tools with thorough positive and negative cases

The draft auto-saves at every step, so take your time. Once submitted, you're in OpenAI's queue — and if everything checks out, your MCP app will be live in the ChatGPT directory.
