# Geco Employee Directory

A SharePoint Framework (SPFx) web part that delivers a fast, modern employee directory inside SharePoint Online and Microsoft Teams — powered by Microsoft Graph API.

This repository is the Geco Technologies fork of [Modern Employee Directory](https://github.com/vishpowerlabs/ModernEmployeeDirectory) (MIT). It is packaged with its own product ID so it can be deployed next to the upstream app. Use it for Geco-managed tenants such as Britten Pears Arts, where the directory needs to include people from more than one email domain.

![Employee Directory Grid View](emp_dir_grid_view.png)

---

## Features

### Layout & Display
- Grid and List views with switchable layouts
- Profile viewing styles — Classic Scrolling, Modern Tabbed, or Modal Overlay
- Org chart visualisation — Vertical Tree, Horizontal Tree, or Compact List
- Adjustable container margins, badge sizes, and font sizes to match your branding
- Full theme support including dark mode and high contrast

### Search & Filtering
- Live search by name, department, or job title
- Scope the directory by Department, Office Location, one or more Email Domains, or Extension Attribute
- Optional member-only view that leaves out guest accounts (`userType` Guest)
- On-page dropdown filters for Department, Office Location, Job Title, City, State, and Country
- Pagination via Load More or Previous / Next with configurable page size (5–50 users)

### Kudos & Recognition
- Peer-to-peer Kudos system with badge types and messages
- Data stored in a configurable SharePoint list with column mapping
- Hall of Fame dashboard — auto-populate by Kudos threshold or manually pin featured people

### Self-Service Profile Updates
- Employees can update their own profile directly from the web part
- Admins control which fields are editable: Job Title, Bio, Mobile, Office Location, Skills, Interests, Past Projects

### Audit Logging
- Track directory interactions and profile update activity to a SharePoint list
- Captures Activity Type, Actor, Target, and JSON detail payload
- Debug panel for on-page audit diagnostics

### Microsoft Teams Ready
- Works as a SharePoint web part, Full Page App, Teams Personal App, and Teams Tab
- Real-time Teams presence indicators via Graph API

---

## Screenshots

### Grid View
![Employee Directory Grid View](emp_dir_grid_view.png)

### Grid View — Selected Card
![Employee Directory Grid Selected Card](emp_dir_grid_selected_card.png)

### List View
![Employee Directory List View](emp_dir_list_view.png)

### List View — Account Menu
![Employee Directory List Account Menu](emp_dir_list_account_menu.png)

### Profile Panel & Update
![Employee Directory Profile and Update](emp_dir_profile_and_update.png)

---

## Prerequisites

- SharePoint Online tenant
- Microsoft 365 with Graph API access
- Node.js >= 22.14.0
- SPFx 1.22.0

---

## Toolchain

| Tool | Version |
| :--- | :--- |
| SPFx | 1.22.0 |
| Node.js | 22.x |
| React | 17.0.1 |
| Fluent UI React | 8.x |
| PnP JS | 4.x |
| TypeScript | 5.8.x |
| Build | Rush Stack Heft |

> Built and bundled using the SPFx Heft build rig (`@microsoft/spfx-web-build-rig`).

---

## Build the package

Requires Node.js >= 22.14.0 and < 23 (the SPFx 1.22 toolchain).

```bash
npm ci
npm run build
```

`npm run build` runs the Heft test suite and then packages the solution. The App Catalog file is written to:

`sharepoint/solution/geco-employee-directory.sppkg`

A copy of that package is also kept at the repository root as `geco-employee-directory.sppkg`.

---

## Deploy to the App Catalog

1. Open the tenant **SharePoint App Catalog** (`/_layouts/15/tenantAppCatalog.aspx` or the site collection app catalog).
2. Upload `geco-employee-directory.sppkg`.
3. When prompted, check **Make this solution available to all sites in the organization** if every site should be able to add the web part. Choose **Enable app** / **Deploy**.
4. Open **SharePoint Admin Center → Advanced → API access**.
5. Approve the pending Microsoft Graph requests from this package (listed below). They are declared in `config/package-solution.json` under `webApiPermissionRequests`, so they show up here after the package is deployed. A tenant admin must approve them before directory, presence, and profile-update calls succeed.
6. On a modern page (or a Teams tab), add the **Geco Employee Directory** web part.
7. Open the property pane and set the organisation filter. For Britten Pears Arts, set **Filter Type** to **By Email Domain** and **Email domains** to:

   `brittenpearsarts.org, snapemaltings.co.uk`

The solution id is `f37f23a2-c9c2-411c-b85d-46f79d8b969c`. That id is different from the upstream Modern Employee Directory product, so both packages can stay in the same app catalog. The web part component id is `a199bd4d-ed10-46ed-8ff3-fc9b4be353f6`.

To ship an update, increment `solution.version` in `config/package-solution.json` (four-part version), rebuild, and upload the new `.sppkg` over the existing app.

---

## Graph API Permissions

Declared on the package and approved in SharePoint Admin Center under **API access**:

| Permission | Purpose |
| :--- | :--- |
| `User.Read.All` | Query the directory, managers, and direct reports |
| `User.ReadWrite` | Allow the signed-in user to update their own profile (`PATCH /me`), skills, and interests |
| `Presence.Read.All` | Show real-time Teams presence |
| `People.Read.All` | Populate colleague and people suggestions |

`User.ReadWrite` is the delegated permission used for self-service edits. It does not grant editing of other people's profiles.

---

## Configuration

The property pane is split across three pages.

### Page 1 — General

| Setting | Description |
| :--- | :--- |
| **Description** | Header text for the web part instance |
| **Container Margin** | Outer margin 0–30px |
| **Badge Circle Size** | Avatar badge size 20–60px |
| **Badge Font Size** | Initials font size 8–20px |
| **Profile Viewing Style** | Classic Scrolling, Modern Tabbed, or Modal Overlay |
| **Org Chart Layout** | Vertical Tree, Horizontal Tree, or Compact List |
| **Homepage Title Font Size** | 20–40px |
| **Detail Page Title Font Size** | 16–32px |
| **Section Heading Font Size** | 12–24px |
| **Enable Pagination** | Toggle pagination on or off |
| **Users per Page** | 5–50 users per page |
| **Pagination Style** | Load More or Previous / Next |

### Page 2 — Directory Features

| Setting | Description |
| :--- | :--- |
| **Filter Type** | None, Department, Office Location, Email Domain, or Extension Attribute |
| **Email domains** | Shown when Filter Type is **By Email Domain**. One domain (`brittenpearsarts.org`) or a comma/semicolon-separated list (`brittenpearsarts.org, snapemaltings.co.uk`). The directory query includes a person when their mail or user principal name matches **any** listed domain. A single domain uses the same match as before. |
| **Filter Value** | Department, office, or extension attribute value when another filter type is selected |
| **Exclude guest users** | Off by default. When set to **Members only**, queries add `userType eq 'Member'` so Azure AD guest accounts are left out of the directory |
| **Home Page Dropdown Filters** | User-facing filters: Department, Location, Job Title, City, State, Country |
| **Enable Kudos** | Toggle the Kudos recognition system |
| **Min Kudos for Hall of Fame** | Threshold (0–20) for automatic Hall of Fame inclusion |
| **Select Kudos List** | SharePoint list for storing Kudos data |
| **Kudos Column Mapping** | Map Recipient, Author, Message, and Badge Type columns |
| **Manually Featured People** | Pin specific people to the top of the directory |

### Page 3 — Advanced

| Setting | Description |
| :--- | :--- |
| **Updatable Profile Fields** | Fields users can self-edit: Job Title, Bio, Mobile, Office Location, Skills, Interests, Past Projects |
| **Enable Audit Logging** | Toggle audit trail on or off |
| **Select Audit List** | SharePoint list for audit records |
| **Audit Column Mapping** | Map Activity, Actor, Target, and Details columns |
| **Show Audit Debug Panel** | Display raw audit data on the web part for diagnostics |

---

## 💬 Community & Feedback

This project is evolving with real-world usage — your input matters. If you find it useful, please star the repo.

### 💡 Start a Discussion

Have ideas, architecture questions, or want to share how you're using this in your organisation?

👉 Use **GitHub Discussions** to:
- Ask implementation questions
- Share customisations or extensions
- Propose new features
- Discuss best practices for SPFx + Graph

Start here: https://github.com/vishpowerlabs/ModernEmployeeDirectory/discussions

---

### 🐞 Report Issues or Request Features

Found a bug or something not working as expected?

👉 Open an Issue: https://github.com/vishpowerlabs/ModernEmployeeDirectory/issues

Include:
- Steps to reproduce
- Screenshots (if applicable)
- Environment details (Tenant, SPFx version, etc.)

---

### ⭐ Share Feedback / Real Usage

Using this in production or a POC?
- Drop a comment on the blog: https://www.wrvishnu.com/modern-employee-directory-sharepoint/
- Share what worked (or didn't)
- Suggest improvements

Real-world feedback directly shapes the roadmap.

---

### 🙌 Contribute Ideas (Even Without Code)

Not a developer? No problem.

You can still contribute by:
- Suggesting UX improvements
- Reporting edge cases
- Voting on features in Discussions
- Sharing use cases from your organisation

---

## License

MIT. This fork keeps the upstream Modern Employee Directory license. Original work by [Vishpowerlabs](https://vishpowerlabs.com) · Blog: [wrvishnu.com](https://wrvishnu.com). Geco-specific packaging, multi-domain filtering, and permission declarations are included under the same MIT terms.
