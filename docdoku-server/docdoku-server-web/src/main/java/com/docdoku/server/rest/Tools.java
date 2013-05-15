/*
 * DocDoku, Professional Open Source
 * Copyright 2006 - 2013 DocDoku SARL
 *
 * This file is part of DocDokuPLM.
 *
 * DocDokuPLM is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * DocDokuPLM is distributed in the hope that it will be useful,  
 * but WITHOUT ANY WARRANTY; without even the implied warranty of  
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the  
 * GNU Affero General Public License for more details.  
 *  
 * You should have received a copy of the GNU Affero General Public License  
 * along with DocDokuPLM.  If not, see <http://www.gnu.org/licenses/>. 
 */

package com.docdoku.server.rest;

import com.docdoku.core.common.User;
import com.docdoku.core.common.UserGroup;
import com.docdoku.core.security.ACL;
import com.docdoku.core.security.ACLUserEntry;
import com.docdoku.core.security.ACLUserGroupEntry;
import com.docdoku.server.rest.dto.ACLDTO;
import com.docdoku.server.rest.dto.DocumentIterationDTO;
import com.docdoku.server.rest.dto.DocumentMasterDTO;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 *
 * @author Florent Garin
 */
public class Tools {
    
    private Tools(){};
    
    public static String stripTrailingSlash(String completePath){
        if(completePath.charAt(completePath.length()-1)=='/')
            return completePath.substring(0,completePath.length()-1);
        else
            return completePath;
    }
    
    public static String stripLeadingSlash(String completePath){
        if(completePath.charAt(0)=='/')
            return completePath.substring(1,completePath.length());
        else
            return completePath;
    }
    
    public static String replaceSlashWithColon(String completePath){
        return completePath.replaceAll("/", ":");
    }
    
    public static String replaceColonWithSlash(String completePath){
        return completePath.replaceAll(":", "/");
    }    

    public static DocumentMasterDTO createLightDocumentMasterDTO(DocumentMasterDTO docMsDTO){
       
       if (docMsDTO.getLastIteration() != null) {      
           DocumentIterationDTO lastIteration = docMsDTO.getLastIteration();
           List<DocumentIterationDTO> iterations = new ArrayList<DocumentIterationDTO>();
           iterations.add(lastIteration);
           docMsDTO.setDocumentIterations(iterations);
       }
       
       docMsDTO.setTags(null);
       docMsDTO.setWorkflow(null);
       docMsDTO.setAcl(null);

       return docMsDTO;
   }


    public static ACLDTO mapACLtoACLDTO(ACL acl) {

        ACLDTO aclDTO = new ACLDTO();

        for (Map.Entry<User,ACLUserEntry> entry : acl.getUserEntries().entrySet()) {
            ACLUserEntry aclEntry = entry.getValue();
            aclDTO.addUserEntry(aclEntry.getPrincipalLogin(),aclEntry.getPermission());
        }

        for (Map.Entry<UserGroup,ACLUserGroupEntry> entry : acl.getGroupEntries().entrySet()) {
            ACLUserGroupEntry aclEntry = entry.getValue();
            aclDTO.addGroupEntry(aclEntry.getPrincipalId(),aclEntry.getPermission());
        }

        return aclDTO;

    }
}
