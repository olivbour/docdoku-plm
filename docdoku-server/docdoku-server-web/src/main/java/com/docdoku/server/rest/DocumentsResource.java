/*
 * DocDoku, Professional Open Source
 * Copyright 2006, 2007, 2008, 2009, 2010, 2011, 2012 DocDoku SARL
 *
 * This file is part of DocDoku.
 *
 * DocDoku is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * DocDoku is distributed in the hope that it will be useful,  
 * but WITHOUT ANY WARRANTY; without even the implied warranty of  
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the  
 * GNU General Public License for more details.  
 *  
 * You should have received a copy of the GNU General Public License  
 * along with DocDoku.  If not, see <http://www.gnu.org/licenses/>.  
 */
package com.docdoku.server.rest;

import com.docdoku.core.common.User;
import com.docdoku.core.common.UserGroup;
import com.docdoku.core.common.Workspace;
import com.docdoku.core.document.DocumentMaster;
import com.docdoku.core.security.ACL;
import com.docdoku.core.security.ACLUserEntry;
import com.docdoku.core.security.ACLUserGroupEntry;
import com.docdoku.core.security.UserGroupMapping;
import com.docdoku.core.services.IDocumentManagerLocal;
import com.docdoku.server.rest.dto.*;
import com.docdoku.server.rest.exceptions.ApplicationException;
import org.dozer.DozerBeanMapperSingletonWrapper;
import org.dozer.Mapper;

import javax.annotation.PostConstruct;
import javax.annotation.security.DeclareRoles;
import javax.annotation.security.RolesAllowed;
import javax.ejb.EJB;
import javax.ejb.Stateless;
import javax.ws.rs.*;
import javax.ws.rs.core.Response;
import java.net.URI;
import java.util.Map;

@Stateless
@DeclareRoles(UserGroupMapping.REGULAR_USER_ROLE_ID)
@RolesAllowed(UserGroupMapping.REGULAR_USER_ROLE_ID)
public class DocumentsResource {

    @EJB
    private IDocumentManagerLocal documentService;

    @EJB
    private DocumentResource document;

    private Mapper mapper;

    public DocumentsResource() {
    }

    @PostConstruct
    public void init() {
        mapper = DozerBeanMapperSingletonWrapper.getInstance();
    }

    @Path("{docKey}")
    @Produces("application/json;charset=UTF-8")
    public DocumentResource getDocument() {
        return document;
    }

    @GET
    @Produces("application/json;charset=UTF-8")
    public DocumentMasterDTO[] getDocuments(@PathParam("workspaceId") String workspaceId, @PathParam("folderId") String folderId) {

        try {

            String decodedCompletePath = getPathFromUrlParams(workspaceId, folderId);
            DocumentMaster[] docM = documentService.findDocumentMastersByFolder(decodedCompletePath);
            DocumentMasterDTO[] dtos = new DocumentMasterDTO[docM.length];

            for (int i = 0; i < docM.length; i++) {
                dtos[i] = mapper.map(docM[i], DocumentMasterDTO.class);
                dtos[i].setPath(docM[i].getLocation().getCompletePath());
                dtos[i] = Tools.createLightDocumentMasterDTO(dtos[i]);
            }

            return dtos;
        } catch (com.docdoku.core.services.ApplicationException ex) {
            throw new RestApiException(ex.toString(), ex.getMessage());
        }

    }

    @POST
    @Consumes("application/json;charset=UTF-8")
    @Produces("application/json;charset=UTF-8")
    public Response createDocumentMasterInFolder(@PathParam("workspaceId") String workspaceId, DocumentCreationDTO docCreationDTO, @PathParam("folderId") String folderId) {

        String pDocMID = docCreationDTO.getReference();
        String pTitle = docCreationDTO.getTitle();
        String pDescription = docCreationDTO.getDescription();

        String decodedCompletePath = getPathFromUrlParams(workspaceId, folderId);

        String pWorkflowModelId = docCreationDTO.getWorkflowModelId();
        String pDocMTemplateId = docCreationDTO.getTemplateId();

        /* Null value for test purpose only */
        ACLDTO acl = null;

        try {
            ACLUserEntry[] userEntries = null;
            ACLUserGroupEntry[] userGroupEntries = null;
            if (acl != null) {
                userEntries = new ACLUserEntry[acl.getUserEntries().size()];
                userGroupEntries = new ACLUserGroupEntry[acl.getGroupEntries().size()];
                int i = 0;
                for (Map.Entry<String, ACLDTO.Permission> entry : acl.getUserEntries().entrySet()) {
                    userEntries[i] = new ACLUserEntry();
                    userEntries[i].setPrincipal(new User(new Workspace(workspaceId), entry.getKey()));
                    userEntries[i++].setPermission(ACL.Permission.valueOf(entry.getValue().name()));
                }
                i = 0;
                for (Map.Entry<String, ACLDTO.Permission> entry : acl.getGroupEntries().entrySet()) {
                    userGroupEntries[i] = new ACLUserGroupEntry();
                    userGroupEntries[i].setPrincipal(new UserGroup(new Workspace(workspaceId), entry.getKey()));
                    userGroupEntries[i++].setPermission(ACL.Permission.valueOf(entry.getValue().name()));
                }
            }

            DocumentMaster createdDocMs =  documentService.createDocumentMaster(decodedCompletePath, pDocMID, pTitle, pDescription, pDocMTemplateId, pWorkflowModelId, userEntries, userGroupEntries);
            DocumentMasterDTO docMsDTO = mapper.map(createdDocMs, DocumentMasterDTO.class);
            docMsDTO.setPath(createdDocMs.getLocation().getCompletePath());
            docMsDTO.setLifeCycleState(createdDocMs.getLifeCycleState());

            return Response.created(URI.create(pDocMID + "-" + createdDocMs.getVersion())).entity(docMsDTO).build();

        } catch (com.docdoku.core.services.ApplicationException ex) {
            throw new RestApiException(ex.toString(), ex.getMessage());
        }

    }

    private String getPathFromUrlParams(String workspaceId, String folderId) {
        return folderId == null ? Tools.stripTrailingSlash(workspaceId) : Tools.stripTrailingSlash(Tools.replaceColonWithSlash(folderId));
    }

    @GET
    @Path("checkedout")
    @Produces("application/json;charset=UTF-8")
    public DocumentMasterDTO[] getCheckedOutDocMs(@PathParam("workspaceId") String workspaceId) throws ApplicationException {

        try {
            DocumentMaster[] checkedOutdocMs = documentService.getCheckedOutDocumentMasters(workspaceId);
            DocumentMasterDTO[] checkedOutdocMsDTO = new DocumentMasterDTO[checkedOutdocMs.length];

            for (int i = 0; i < checkedOutdocMs.length; i++) {
                checkedOutdocMsDTO[i] = mapper.map(checkedOutdocMs[i], DocumentMasterDTO.class);
                checkedOutdocMsDTO[i].setPath(checkedOutdocMs[i].getLocation().getCompletePath());
                checkedOutdocMsDTO[i] = Tools.createLightDocumentMasterDTO(checkedOutdocMsDTO[i]);
            }

            return checkedOutdocMsDTO;

        } catch (com.docdoku.core.services.ApplicationException ex) {
            throw new RestApiException(ex.toString(), ex.getMessage());
        }
    }


//    @GET
//    @Path()
//    @Produces("application/json;charset=UTF-8")
//    public DocumentMasterDTO[] getIterationChangeEventSubscriptions(@PathParam("workspaceId") String workspaceId) {
//
//        try {
//
//            DocumentMasterKey[] docMKey = documentService.getIterationChangeEventSubscriptions(workspaceId);
//            DocumentMasterDTO[] data = new DocumentMasterDTO[docMKey.length];
//
//            for (int i = 0; i < docMKey.length; i++) {
//                DocumentMasterDTO dto = new DocumentMasterDTO();
//                dto.setWorkspaceID(docMKey[i].getWorkspaceId());
//                dto.setId(docMKey[i].getId());
//                dto.setReference(docMKey[i].getId());
//                dto.setVersion(docMKey[i].getVersion());
//                data[i] = dto;
//            }
//
//            return data;
//
//        } catch (com.docdoku.core.services.ApplicationException ex) {
//            throw new RESTException(ex.toString(), ex.getMessage());
//        }
//
//    }
//
//    @GET
//    @Path()
//    @Produces("application/json;charset=UTF-8")
//    public DocumentMasterDTO[] getStateChangeEventSubscriptions(@PathParam("workspaceId") String workspaceId) {
//
//        try {
//
//            DocumentMasterKey[] docMKey = documentService.getStateChangeEventSubscriptions(workspaceId);
//            DocumentMasterDTO[] data = new DocumentMasterDTO[docMKey.length];
//
//            for (int i = 0; i < docMKey.length; i++) {
//                DocumentMasterDTO dto = new DocumentMasterDTO();
//                dto.setWorkspaceID(docMKey[i].getWorkspaceId());
//                dto.setId(docMKey[i].getId());
//                dto.setReference(docMKey[i].getId());
//                dto.setVersion(docMKey[i].getVersion());
//                data[i] = dto;
//            }
//
//            return data;
//
//        } catch (com.docdoku.core.services.ApplicationException ex) {
//            throw new RESTException(ex.toString(), ex.getMessage());
//        }
//
//    }
//

}
