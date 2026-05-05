<claude-mem-context>
# Memory Context

# [workaholic] recent context, 2026-05-05 6:09pm GMT-3

Legend: 🎯session 🔴bugfix 🟣feature 🔄refactor ✅change 🔵discovery ⚖️decision 🚨security_alert 🔐security_note
Format: ID TIME TYPE TITLE
Fetch details: get_observations([IDs]) | Search: mem-search skill

Stats: 1 obs (348t read) | 7.197t work | 95% savings

### Apr 24, 2026
S41 Chrome Web Store Rejected "Workaholic" Extension for Keyword Spam (Apr 24, 10:03 PM)
S3 User asked why responses are taking so long to arrive (Apr 24, 10:03 PM)
### Apr 25, 2026
27 10:31a 🔵 Chrome Web Store Rejected "Workaholic" Extension for Keyword Spam
S43 Chrome Web Store rejection of "Workaholic" extension for keyword spam — fix store listing description (Apr 25, 10:32 AM)
**Investigated**: The manifest.json of the Workaholic Chrome extension was read. It is a Manifest V3 extension that filters freelance job listings across Upwork, Workana, 99Freelas, LinkedIn, Indeed (BR), and Gupy based on the user's skill profile. The manifest.json description itself is clean and concise ("Filters freelance jobs from multiple platforms based on your skill profile"). The project structure includes a background service worker, popup UI, parsers per platform, and uses permissions: storage, alarms, notifications, scripting, tabs.

**Learned**: The CWS rejection was not caused by the manifest.json description — that field is short and clean. The violation was in the long-form store listing description written in the Chrome Web Store Developer Dashboard, where the platform names (Upwork, Workana, 99Freelas, LinkedIn, Indeed BR, Gupy) were likely listed in a way that appeared as keyword stuffing rather than natural prose. CWS policy treats repeated or decontextualized brand/keyword lists as metadata spam even when those platforms are genuinely supported by the extension.

**Completed**: A replacement store listing description was drafted in Portuguese that: (1) mentions each platform name exactly once, grouped in a single contextual paragraph; (2) leads with user benefits and how the extension works; (3) uses natural prose rather than keyword lists. A short description (under 132 characters) was also provided. Instructions were given to update the description in the CWS Developer Dashboard under "Ficha da Chrome Web Store" before resubmitting.

**Next Steps**: User needs to copy the new description into the Chrome Web Store Developer Dashboard and resubmit the extension for review. No code changes are needed — only the store listing metadata requires updating.


Access 7k tokens of past work via get_observations([IDs]) or mem-search skill.
</claude-mem-context>