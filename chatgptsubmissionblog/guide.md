Here's a comprehensive write-up of the entire process, structured for your writer:
How to Submit an MCP App to ChatGPT — Full Walkthrough
Overview
Submitting an app to the ChatGPT App directory requires going through a multi-step form on the OpenAI Platform (platform.openai.com). The process is broken into 6 sections, visible as a progress stepper at the top of the page: App Info → MCP Server → Testing → Screenshots → Global → Submit. Each section must be completed before moving to the next. The draft is saved automatically as you go.
Step 1 — Finding the Apps Section
Navigate to platform.openai.com and look for "ChatGPT Apps" in the left sidebar under the "Manage" section. This brings you to your Apps dashboard, which lists all your existing apps and their review statuses. To start a new submission, click the "+ New App" button in the top-right corner.
Step 2 — App Info
This is the most content-heavy step. It covers everything that will be publicly visible about your app.
Logo Icon
Upload a square SVG at 64×64px. Do not add rounded corners or borders yourself — the platform applies circular cropping automatically. You can also add a dark mode version of the icon. This field is required — the form will not let you proceed without it.
App Name
Keep it short and clear. This is what users will see in the directory. In our case: Video Generator.
Subtitle (30 characters max)
A single plain-language phrase describing what the app does. Avoid marketing language. Think of it like a tag line focused purely on function: "Create animated videos with AI."
Description
A longer paragraph that explains the app's value. Focus on what the user can actually do with it, not on technical implementation. This appears on the app's public directory page. Aim for 2–4 sentences covering the core use case, how it works at a high level, and what kinds of tasks it's good for.
Category
A dropdown with options like Business, Collaboration, Design, Developer Tools, Education, Entertainment, Finance, Food, Lifestyle, Productivity, Shopping, and Travel. Choose the one that best fits your app's primary purpose. For a video creation tool, Productivity is a natural fit.
Developer
Your name or your organization's name. This is public-facing.
Website URL
Link to your app's homepage or GitHub repository.
Customer Support URL or Email
Where users can go if they have problems. A GitHub Issues page works perfectly for open-source projects.
Privacy Policy URL
Required. If you don't have a dedicated privacy policy page, linking to your LICENSE file or a GitHub page that outlines your terms is acceptable for an initial submission, though a proper privacy policy is recommended.
Terms of Service URL
Same as above — can mirror your Privacy Policy URL for simpler projects.
Demo Recording URL
A link to a video demonstrating the app in action. The recording should cover all major use cases across web, iOS, and Android. You can use a GitHub repository link as a placeholder if the recording isn't ready yet, but a real demo video will significantly help your review.
App Commerce & Purchasing
A checkbox asking whether your app links or directs users outside ChatGPT to make purchases. For most developer tools and open-source apps, this stays unchecked.
Step 3 — MCP Server
This is the technical heart of the submission.
MCP Server URL
Enter the full URL to your running MCP server endpoint. This should end in /mcp. For example: https://your-app.run.mcp-use.com/mcp. The server must be live and publicly accessible at the time of submission — not running on localhost.
Authentication
A dropdown to specify how your server authenticates requests. Options include No Auth, OAuth, and others. For public servers with no authentication required, select No Auth.
Scan Tools
Once you've entered the server URL, click the "Scan Tools" button. The platform will connect to your MCP server and automatically discover all the tools it exposes. This usually takes a few seconds. When complete, a "Tool justification" section appears below.
Tool Justification
For every tool discovered on your server, you must fill in three justification fields:

Read Only — explain whether the tool reads data only or can write/modify things
Open World — explain whether the tool can access or reference external systems, patterns, or data beyond the immediate session
Destructive — explain whether the tool can permanently alter or delete data
These descriptions don't need to be long — one clear sentence per field is enough. Be accurate: OpenAI reviewers use these to verify that the tool annotations in your MCP server code are correct.
Domain Verification
Below the tool justifications is a domain verification section. When you first arrive, it shows "Domain not verified" in red. The platform generates a unique verification token and tells you exactly where to place it: at /.well-known/openai-apps on your server's domain.
The process is:


Copy the verification token shown on screen
Create a file at the exact path shown (e.g., https://your-domain.com/.well-known/openai-apps)
The file should contain only the token as plain text — nothing else
Deploy or restart your server so the file is accessible
Come back to the form and click "Verify Domain"
When successful, the red "Domain not verified" message turns into a green "Domain verified" checkmark. This is a required step — you cannot proceed without it.


Step 4 — Testing
This step requires you to write test cases that OpenAI's team will use to manually test your app during review. You need at least 5 positive test cases and 3 negative test cases.
Positive test cases describe scenarios where your app should work correctly. Each case has four fields:

Scenario — a short description of the use case (e.g., "Create a simple animated title card video")
User prompt — the exact message a user would type to trigger this behavior (e.g., "Create a video with a bold white title 'Hello World' that fades in on a dark background")
Tool triggered — which MCP tool(s) should be called (e.g., create_video)
Expected output — what the user should see or receive (e.g., "A rendered video player showing an animated title card with smooth fade-in effect")
Negative test cases describe scenarios where the app should not trigger, even though the request might seem loosely related. These help the reviewers understand the boundaries of your app. Good negative cases include requests that are out of scope (e.g., "Search the web for video editing software") or requests that go beyond the app's capabilities (e.g., "Export this video as an MP4 and download it"). Each case has the same four fields — for the Tool triggered field, put "None".
Tip: cover your main tools across the positive cases. If you have multiple tools, make sure each one appears in at least one test case.


Step 5 — Screenshots
You need to upload at least 1 screenshot and can upload up to 4. These appear on your app's public directory listing.
Requirements:

Format: PNG or JPG
Width: exactly 706px
Minimum height: 400px
Recommended height: 860px
Must show only your app widget UI — no ChatGPT interface chrome around it
No user prompts or AI responses baked into the image
Avoid embedded text where possible since OpenAI localizes the app for different regions
OpenAI provides a public Figma template to help you create compliant screenshots easily. This is worth using — non-compliant screenshots are one of the most common reasons for app rejection.


Step 6 — Global
A short but important step with two settings:
Translations
English (US) is included by default. You can add translations for other locales if your app supports them.
Allowed Countries
A dropdown to control which countries your app will be available in. The default is "Allow all" — leave this unless you have specific geographic restrictions.
Step 7 — Submit
The final step shows a preview of your app card (icon, name, subtitle) exactly as it will appear in the directory.
Release Notes
A text field for notes about this version. For a first submission, describe what the app does and its key features. This may be shown publicly.
Policy Compliance
A series of checkboxes you must read and confirm before submitting:

You've reviewed and agree to OpenAI's Terms and App Submission Guidelines
Your app is compliant with those terms
Your app complies with all applicable laws and regulations
Your app does not initiate financial transactions on behalf of users
Your app does not serve advertisements
You have the rights to all third-party content used
Your app is not designed for children under 13
Whether your app contains mature/adult content (yes/no)
You also select whether you're submitting as an Individual or a Business. If submitting as a business, OpenAI requires you to verify your business beforehand through your organization settings.
Once all checkboxes are checked and the form is complete, the "Submit for Review" button becomes the final action. Clicking it sends your app into OpenAI's review queue. Note that submitting does not guarantee listing in the directory — it goes through a manual review process.


Key Things to Know Before You Start

Your server must be live. You cannot test or verify a localhost server. Deploy first, then submit.
Domain verification can take a moment. Make sure the file is actually being served correctly at the .well-known/openai-apps path before clicking Verify — you can check it directly in a browser tab.
The logo is required to proceed from App Info to MCP Server. Have your icon ready before starting.
Screenshots are required to get past the Screenshots step. The 706px width requirement is strict — prepare these in advance.
The draft autosaves. You don't need to complete everything in one session. You can return to any step using the stepper at the top, and your progress will be saved.
Business verification is separate. If submitting as a business, go to your OpenAI organization settings and complete business verification before starting the submission — otherwise you'll be blocked on the final step.