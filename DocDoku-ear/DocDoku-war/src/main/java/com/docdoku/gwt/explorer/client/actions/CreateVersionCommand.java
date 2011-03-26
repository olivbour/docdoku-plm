/*
 * DocDoku, Professional Open Source
 * Copyright 2006, 2007, 2008, 2009, 2010 DocDoku SARL
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
package com.docdoku.gwt.explorer.client.actions;

import com.docdoku.gwt.explorer.client.data.ServiceLocator;
import com.docdoku.gwt.explorer.client.ui.ExplorerPage;
import com.docdoku.gwt.explorer.client.util.HTMLUtil;
import com.docdoku.gwt.explorer.shared.ACLDTO;
import com.docdoku.gwt.explorer.shared.MasterDocumentDTO;
import com.google.gwt.user.client.rpc.AsyncCallback;

/**
 *
 * @author Florent GARIN
 */
public class CreateVersionCommand implements Action{

    private ExplorerPage m_mainPage;


    public CreateVersionCommand(ExplorerPage mainPage){
        m_mainPage = mainPage;
    }

    public void execute(Object... userObject) {
                AsyncCallback<MasterDocumentDTO[]> callback = new AsyncCallback<MasterDocumentDTO[]>() {
                    public void onSuccess(MasterDocumentDTO[] mdocs) {
                        m_mainPage.refreshElementTable();
                    }

                    public void onFailure(Throwable caught) {
                        HTMLUtil.showError(caught.getMessage());
                    }
                };

                String workspaceId= (String) userObject[0];
                String id = (String) userObject[1];
                String version = (String) userObject[2];
                String title=(String)userObject[3];
                String workflowModelId=(String)userObject[4];
                String description=(String)userObject[5];
                ACLDTO acl=(ACLDTO) userObject[6];
                ServiceLocator.getInstance().getExplorerService().createVersion(workspaceId, id, version, title, description, workflowModelId, acl, callback);
                m_mainPage.showTablePanel();
    }

}
