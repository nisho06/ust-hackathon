# 🧩 autoSaveMonitor LWC  
**Location:** `force-app/main/default/lwc/autoSaveMonitor`  
**Project:** [UST Hackathon – Salesforce DX](https://github.com/nisho06/ust-hackathon)

---

## 📘 Overview
`autoSaveMonitor` is a **Lightning Web Component (LWC)** designed to protect user work and enhance productivity by automatically monitoring session activity, saving progress periodically, and prompting users before session timeouts.  

It helps Salesforce agents avoid data loss during long case management sessions by:
- Automatically saving unsaved changes as drafts.
- Displaying **session expiration warnings** before automatic logout.
- Allowing users to **extend their session** or **recover unsaved drafts** after timeout.

---

## ⚙️ Features
- ⏱️ **Session Monitoring:** Tracks user activity and idle time.  
- 💾 **Autosave Drafts:** Periodically saves work-in-progress records or field data.  
- ⚠️ **Timeout Warning:** Displays alerts 5–10 minutes before logout.  
- 🔄 **Session Extension:** Keeps the session active if the user confirms.  
- ♻️ **Draft Recovery:** Restores unsaved data when the user logs back in.  
- 📱 **Offline Safe:** (Optional) Can be extended to support offline caching and sync.

---

## 🧠 Architecture
| Layer | Responsibility |
|--------|----------------|
| **UI (HTML)** | Displays alerts, modals, and recovery prompts |
| **Controller (JS)** | Handles timers, user activity tracking, autosave logic |
| **Metadata (XML)** | Declares visibility and targets (App Page, Record Page, etc.) |
| **Apex (optional)** | Manages server-side draft save and recovery |

---

## 📁 File Structure
autoSaveMonitor/
│
├── autoSaveMonitor.html # UI template
├── autoSaveMonitor.js # Component logic
├── autoSaveMonitor.js-meta.xml # Metadata configuration
├── autoSaveMonitor.css # Optional styling
└── README.md # Documentation (this file)


--------------------
yaml file

## 🧩 Configuration
### Step 1: Deploy the Component
Use Salesforce CLI to deploy the component to your org:
```bash
sfdx force:source:deploy -p force-app/main/default/lwc/autoSaveMonitor -u <OrgAlias>

--------------------
Step 2: Add to a Lightning Page

Navigate to Setup → Lightning App Builder.

Choose a Record Page, App Page, or Home Page.

In the Components panel, look under Custom – Managed/Unmanaged.

Drag and drop autoSaveMonitor onto the page layout.

Click Save → Activate → assign to apps and profiles.

For portals, use Experience Builder and add under Custom Components, then Publish.

⚙️ Design Parameters (Optional)

You can expose editable properties in App Builder by defining a .design file.

Example (add autoSaveMonitor.design):
------------------------------
xml
<design>
  <property name="warningThresholdMinutes" label="Warning Before Timeout (Minutes)" type="Integer" default="5"/>
  <property name="autosaveIntervalMinutes" label="Autosave Interval (Minutes)" type="Integer" default="10"/>
</design>
------------------------------

Use in your JS file:
------------------------------
js

import { api, LightningElement } from 'lwc';

export default class AutoSaveMonitor extends LightningElement {
    @api warningThresholdMinutes;
    @api autosaveIntervalMinutes;

    connectedCallback() {
        this.startMonitoring();
    }
}
------------------------------
🔔 Example Behavior

Agent opens a Case record.

After 50 minutes of activity, a modal appears:

⚠️ “Your session will expire in 10 minutes. Click ‘Stay Logged In’ to continue.”

If the user ignores it, the system autosaves the current form data to a draft record.

When the user logs in again, the component prompts:

“A saved draft from your previous session was found. Restore it?”

Selecting “Restore” reloads the last autosaved version.

🧩 Integration with Apex (Optional)

If you need to persist drafts in Salesforce, create an Apex class like:
------------------------------
apex

public with sharing class AutoSaveController {
    @AuraEnabled
    public static void saveDraft(String recordId, String jsonData) {
        // Store serialized form data in a Draft__c record
        Draft__c draft = new Draft__c(Parent_Record__c = recordId, Data__c = jsonData);
        insert draft;
    }

    @AuraEnabled
    public static Draft__c getDraft(String recordId) {
        return [SELECT Id, Data__c FROM Draft__c WHERE Parent_Record__c = :recordId LIMIT 1];
    }
}

------------------------------
Then call from JS:
------------------------------
js

import saveDraft from '@salesforce/apex/AutoSaveController.saveDraft';

------------------------------

🧪 Testing

Run Jest tests or Apex tests for your component:

Unit Tests (Jest):
------------------------------
bash

npm run test:unit
------------------------------

Apex Tests (SFDX):
------------------------------
bash

sfdx force:apex:test:run --resultformat human --codecoverage
------------------------------

Manual Scenarios:

Idle timeout warning appears correctly.

Autosave triggers at correct intervals.

Draft data can be restored successfully.

Session extension call refreshes Salesforce session.

🚀 Future Enhancements

Offline caching using IndexedDB for portals.

Auto-save on tab close/unload.

Admin dashboard for monitoring draft recovery.

User-configurable save intervals.

Visual indicator showing last autosave timestamp.

👥 Contributors

Author: Nisho06

Maintainers: UST Hackathon Dev Team

Contact: GitHub Issues