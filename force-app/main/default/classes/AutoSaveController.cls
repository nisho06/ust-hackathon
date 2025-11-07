public with sharing class AutoSaveController {
    public AutoSaveController() {

    }

    // Save draft data
    @AuraEnabled
    public static String saveDraft(String caseId, String draftData, String pageContext) {
        try {
            String userId = UserInfo.getUserId();
            String sessionId = UserInfo.getSessionId();
            
            // Check if draft already exists for this session
            List<Auto_Save__c> existingDrafts = [
                SELECT Id, Draft_Data__c 
                FROM Auto_Save__c 
                WHERE User_Reference__c = :userId 
                AND Case_Reference__c = :caseId 
                AND Session_ID__c = :sessionId
                AND Is_Active__c = true
                LIMIT 1
            ];
            
            Auto_Save__c draft;
            
            if (!existingDrafts.isEmpty()) {
                // Update existing draft
                draft = existingDrafts[0];
                draft.Draft_Data__c = draftData;
                draft.Last_Saved_Time__c = DateTime.now();
                draft.Page_Context__c = pageContext;
            } else {
                // Create new draft
                draft = new Auto_Save__c(
                    Case_Reference__c = caseId,
                    User_Reference__c = userId,
                    Session_ID__c = sessionId,
                    Draft_Data__c = draftData,
                    Page_Context__c = pageContext,
                    Last_Saved_Time__c = DateTime.now(),
                    Is_Active__c = true
                );
            }
            
            upsert draft;
            
            return JSON.serialize(new Map<String, Object>{
                'success' => true,
                'draftId' => draft.Id,
                'timestamp' => DateTime.now().format('hh:mm:ss a')
            });
            
        } catch (Exception e) {
            return JSON.serialize(new Map<String, Object>{
                'success' => false,
                'error' => e.getMessage()
            });
        }
    }

    // Get all active drafts for current user
    @AuraEnabled(cacheable=true)
    public static List<DraftWrapper> getActiveDrafts() {
        String userId = UserInfo.getUserId();
        List<DraftWrapper> wrappers = new List<DraftWrapper>();
        
        List<Auto_Save__c> drafts = [
            SELECT Id, Case_Reference__c, Case_Reference__r.CaseNumber, 
                   Case_Reference__r.Subject, Draft_Data__c, 
                   Last_Saved_Time__c, Page_Context__c
            FROM Auto_Save__c 
            WHERE User_Reference__c = :userId 
            AND Is_Active__c = true
            ORDER BY Last_Saved_Time__c DESC
            LIMIT 50
        ];
        
        for (Auto_Save__c draft : drafts) {
            wrappers.add(new DraftWrapper(draft));
        }
        
        return wrappers;
    }
    
    // Get specific draft
    @AuraEnabled
    public static String getDraft(String caseId) {
        try {
            String userId = UserInfo.getUserId();
            String sessionId = UserInfo.getSessionId();
            
            List<Auto_Save__c> drafts = [
                SELECT Id, Draft_Data__c, Last_Saved_Time__c, Page_Context__c
                FROM Auto_Save__c 
                WHERE User_Reference__c = :userId 
                AND Case_Reference__c = :caseId 
                AND Is_Active__c = true
                ORDER BY Last_Saved_Time__c DESC
                LIMIT 1
            ];
            
            if (!drafts.isEmpty()) {
                return JSON.serialize(new Map<String, Object>{
                    'success' => true,
                    'draftData' => drafts[0].Draft_Data__c,
                    'lastSaved' => drafts[0].Last_Saved_Time__c,
                    'draftId' => drafts[0].Id
                });
            }
            
            return JSON.serialize(new Map<String, Object>{
                'success' => false,
                'message' => 'No draft found'
            });
            
        } catch (Exception e) {
            return JSON.serialize(new Map<String, Object>{
                'success' => false,
                'error' => e.getMessage()
            });
        }
    }
    
    // Restore draft and deactivate
    @AuraEnabled
    public static String restoreDraft(String draftId) {
        try {
            Auto_Save__c draft = [
                SELECT Id, Draft_Data__c, Case_Reference__c
                FROM Auto_Save__c 
                WHERE Id = :draftId
                LIMIT 1
            ];
            
            // Mark as inactive (restored)
            draft.Is_Active__c = false;
            update draft;
            
            return JSON.serialize(new Map<String, Object>{
                'success' => true,
                'draftData' => draft.Draft_Data__c,
                'caseId' => draft.Case_Reference__c
            });
            
        } catch (Exception e) {
            return JSON.serialize(new Map<String, Object>{
                'success' => false,
                'error' => e.getMessage()
            });
        }
    }
    
    // Delete draft
    @AuraEnabled
    public static String deleteDraft(String draftId) {
        try {
            Auto_Save__c draft = [SELECT Id FROM Auto_Save__c WHERE Id = :draftId];
            delete draft;
            
            return JSON.serialize(new Map<String, Object>{
                'success' => true
            });
        } catch (Exception e) {
            return JSON.serialize(new Map<String, Object>{
                'success' => false,
                'error' => e.getMessage()
            });
        }
    }

    // Wrapper class for draft data
    public class DraftWrapper {
        @AuraEnabled public String id;
        @AuraEnabled public String caseId;
        @AuraEnabled public String caseNumber;
        @AuraEnabled public String caseSubject;
        @AuraEnabled public String draftData;
        @AuraEnabled public DateTime lastSaved;
        @AuraEnabled public String pageContext;
        @AuraEnabled public String timeAgo;
        
        public DraftWrapper(Auto_Save__c draft) {
            this.id = draft.Id;
            this.caseId = draft.Case_Reference__c;
            this.caseNumber = draft.Case_Reference__r.CaseNumber;
            this.caseSubject = draft.Case_Reference__r.Subject;
            this.draftData = draft.Draft_Data__c;
            this.lastSaved = draft.Last_Saved_Time__c;
            this.pageContext = draft.Page_Context__c;
            this.timeAgo = calculateTimeAgo(draft.Last_Saved_Time__c);
        }
        
        private String calculateTimeAgo(DateTime savedTime) {
            Long seconds = (DateTime.now().getTime() - savedTime.getTime()) / 1000;
            if (seconds < 60) return seconds + ' seconds ago';
            if (seconds < 3600) return (seconds / 60) + ' minutes ago';
            if (seconds < 86400) return (seconds / 3600) + ' hours ago';
            return (seconds / 86400) + ' days ago';
        }
    }
    
    
}