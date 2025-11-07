import { LightningElement, track, wire } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getActiveDrafts from '@salesforce/apex/AutoSaveController.getActiveDrafts';
import restoreDraft from '@salesforce/apex/AutoSaveController.restoreDraft';
import deleteDraft from '@salesforce/apex/AutoSaveController.deleteDraft';
import { refreshApex } from '@salesforce/apex';

export default class AutoSaveDashboard extends NavigationMixin(LightningElement) {

    @track drafts = [];
    @track isLoading = true;
    @track error;
    wiredDraftsResult;
    
    columns = [
        { label: 'Case Number', fieldName: 'caseNumber', type: 'text' },
        { label: 'Subject', fieldName: 'caseSubject', type: 'text' },
        { label: 'Last Saved', fieldName: 'timeAgo', type: 'text' },
        { label: 'Page', fieldName: 'pageContext', type: 'text' },
        {
            type: 'action',
            typeAttributes: {
                rowActions: [
                    { label: 'Restore', name: 'restore' },
                    { label: 'Delete', name: 'delete' }
                ]
            }
        }
    ];
    
    @wire(getActiveDrafts)
    wiredDrafts(result) {
        this.wiredDraftsResult = result;
        this.isLoading = true;
        
        if (result.data) {
            this.drafts = result.data;
            this.error = undefined;
            this.isLoading = false;
        } else if (result.error) {
            this.error = result.error;
            this.drafts = [];
            this.isLoading = false;
        }
    }
    
    async handleRowAction(event) {
        const actionName = event.detail.action.name;
        const row = event.detail.row;
        
        if (actionName === 'restore') {
            await this.handleRestore(row.id, row.caseId);
        } else if (actionName === 'delete') {
            await this.handleDelete(row.id);
        }
    }
    
    async handleRestore(draftId, caseId) {
        try {
            const result = await restoreDraft({ draftId });
            const data = JSON.parse(result);
            
            if (data.success) {
                this.showToast('Success', 'Draft restored successfully', 'success');
                
                // Navigate to case record
                this[NavigationMixin.Navigate]({
                    type: 'standard__recordPage',
                    attributes: {
                        recordId: caseId,
                        objectApiName: 'Case',
                        actionName: 'view'
                    }
                });
                
                // Refresh the list
                return refreshApex(this.wiredDraftsResult);
            }
        } catch (error) {
            this.showToast('Error', 'Failed to restore draft', 'error');
        }
    }
    
    async handleDelete(draftId) {
        try {
            const result = await deleteDraft({ draftId });
            const data = JSON.parse(result);
            
            if (data.success) {
                this.showToast('Success', 'Draft deleted', 'success');
                return refreshApex(this.wiredDraftsResult);
            }
        } catch (error) {
            this.showToast('Error', 'Failed to delete draft', 'error');
        }
    }
    
    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
    
    get hasDrafts() {
        return this.drafts && this.drafts.length > 0;
    }

}