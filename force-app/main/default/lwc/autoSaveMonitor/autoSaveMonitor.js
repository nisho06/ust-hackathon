import { LightningElement, api, track, wire } from 'lwc';
import { getRecord } from 'lightning/uiRecordApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import saveDraft from '@salesforce/apex/AutoSaveController.saveDraft';
import getDraft from '@salesforce/apex/AutoSaveController.getDraft';

export default class AutoSaveMonitor extends LightningElement {
    @api recordId; // Case ID
    @api autoSaveInterval = 30000; // 30 seconds
    @api showIndicator;
    
    @track lastSavedTime;
    @track isSaving = false;
    @track draftId;
    
    autoSaveTimer;
    formData = {};
    isInitialized = false;
    
    connectedCallback() {
        console.log('Component initialized', this.recordId);

        if (this.showIndicator === undefined) {
            this.showIndicator = true; // default to true
        }
        this.initializeAutoSave();
        this.captureFormChanges();
        this.checkForExistingDraft();
        this.startSessionMonitor();
    }
    
    disconnectedCallback() {
        this.stopAutoSave();
    }
    
    initializeAutoSave() {
        // Start auto-save timer
        this.autoSaveTimer = setInterval(() => {
            this.performAutoSave();
        }, this.autoSaveInterval);
        
        console.log('AutoSave Guardian activated');
    }
    
    stopAutoSave() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
        }
    }
    
    async checkForExistingDraft() {
        try {
            const result = await getDraft({ caseId: this.recordId });
            const data = JSON.parse(result);
            
            if (data.success) {
                // Show restore option
                this.showRestorePrompt(data.draftData, data.lastSaved);
            }
        } catch (error) {
            console.error('Error checking draft:', error);
        }
    }
    
    showRestorePrompt(draftData, lastSaved) {
        const event = new ShowToastEvent({
            title: 'Draft Available',
            message: `A draft from ${new Date(lastSaved).toLocaleString()} was found. Would you like to restore it?`,
            variant: 'info',
            mode: 'sticky'
        });
        this.dispatchEvent(event);
        
        // Dispatch custom event for parent to handle
        this.dispatchEvent(new CustomEvent('draftfound', {
            detail: { draftData }
        }));
    }

    captureFormChanges() {
        // Listen for ANY change on the page
        console.log("Capturing form changes...")
        document.addEventListener('change', (event) => {
            console.log("Event triggered and capturing it.")
            console.log("Event:- ", event);
            console.log("Event target label:- ", event.target.label)
            if (event.target && event.target.name) {

                console.log("Event target Name:- ", event.target.name);
                console.log("Event target value:- ", event.target.value);
                // Store what changed
                this.formData[event.target.name] = event.target.value;
                this.hasUnsavedChanges = true;
            }
        });
    }
    
    @api
    captureFormData(data) {
        // Called by parent component to update form data
        this.formData = { ...this.formData, ...data };
    }
    
    async performAutoSave() {
        console.log("Perform auto save");

        console.log("Form data:- ", this.formData);

        if (Object.keys(this.formData).length === 0) {
            return; // No data to save
        }

        
        this.isSaving = true;
        
        try {
            const result = await saveDraft({
                caseId: this.recordId,
                draftData: JSON.stringify(this.formData),
                pageContext: 'CaseDetail'
            });
            
            const data = JSON.parse(result);
            
            if (data.success) {
                this.lastSavedTime = data.timestamp;
                this.draftId = data.draftId;
                console.log('✓ Auto-saved at:', this.lastSavedTime);
                
                // Dispatch success event
                this.dispatchEvent(new CustomEvent('autosavesuccess', {
                    detail: { timestamp: this.lastSavedTime }
                }));
            }
        } catch (error) {
            console.error('Auto-save failed:', error);
        } finally {
            this.isSaving = false;
        }
    }
    
    startSessionMonitor() {
        // Monitor for session timeout warnings
        // Check every minute
        setInterval(() => {
            this.checkSessionTimeout();
        }, 60000);
    }
    
    checkSessionTimeout() {
        // Get session timeout from Salesforce (default 2 hours = 120 min)
        // Warn at 55 minutes
        const sessionStart = localStorage.getItem('sessionStart');
        if (!sessionStart) {
            localStorage.setItem('sessionStart', new Date().getTime());
            return;
        }
        
        const elapsed = (new Date().getTime() - parseInt(sessionStart)) / 1000 / 60;
        
        if (elapsed >= 55 && elapsed < 56) {
            this.showTimeoutWarning();
            this.performAutoSave(); // Emergency save
        }
    }
    
    showTimeoutWarning() {
        const event = new ShowToastEvent({
            title: 'Session Timeout Warning',
            message: 'Your session will expire in 5 minutes. Your work has been auto-saved.',
            variant: 'warning',
            mode: 'sticky'
        });
        this.dispatchEvent(event);
    }
    
    get saveIndicatorClass() {
        return this.isSaving ? 'saving' : 'saved';
    }
    
    get saveIndicatorText() {
        if (this.isSaving) return 'Saving...';
        if (this.lastSavedTime) return `Last saved: ${this.lastSavedTime}`;
        return 'Auto-save active';
    }
}