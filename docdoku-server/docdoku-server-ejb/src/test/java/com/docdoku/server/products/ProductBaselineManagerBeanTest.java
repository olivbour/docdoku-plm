/*
 * DocDoku, Professional Open Source
 * Copyright 2006 - 2015 DocDoku SARL
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

package com.docdoku.server.products;

import com.docdoku.core.common.User;
import com.docdoku.core.configuration.ProductBaselineCreationReport;
import com.docdoku.core.configuration.ProductBaseline;
import com.docdoku.core.exceptions.*;
import com.docdoku.core.product.*;
import com.docdoku.core.security.ACL;

import com.docdoku.server.DataManagerBean;
import com.docdoku.server.UserManagerBean;
import com.docdoku.server.dao.ConfigurationItemDAO;
import com.docdoku.server.dao.PartIterationDAO;
import com.docdoku.server.util.BaselineRule;
import com.docdoku.server.util.FastTestCategory;


import org.junit.Assert;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.junit.experimental.categories.Category;
import org.junit.rules.ExpectedException;
import org.junit.runner.RunWith;
import org.mockito.*;
import org.mockito.runners.MockitoJUnitRunner;


import javax.ejb.SessionContext;
import javax.persistence.EntityManager;

import java.security.Principal;
import java.util.Locale;



import static org.mockito.Mockito.doReturn;
import static org.mockito.MockitoAnnotations.initMocks;

@RunWith(MockitoJUnitRunner.class)
public class ProductBaselineManagerBeanTest {


    @InjectMocks
    ProductBaselineManagerBean productBaselineService = new ProductBaselineManagerBean();

    @Mock
    SessionContext ctx;
    @Mock
    Principal principal;
    @Mock
    UserManagerBean userManager;
    @Mock
    EntityManager em;
    @Mock
    DataManagerBean dataManager;


    @Rule
    public BaselineRule baselineRuleNotReleased;
    @Rule
    public BaselineRule baselineRuleReleased;
    @Rule
    public BaselineRule baselineRuleACL;

    @Rule
    public ExpectedException thrown = ExpectedException.none();


    @Before
    public void setup() throws Exception {
        initMocks(this);
        Mockito.when(ctx.getCallerPrincipal()).thenReturn(principal);
        Mockito.when(principal.getName()).thenReturn("user1");

    }

    /**
     * test the creation of baseline with a product that contains a part that has not been released yet
     *
     * @throws Exception ConfigurationItemNotReleasedException
     */
    @Category(FastTestCategory.class)
    @Test
    public void createBaselineUsingPartNotReleasedYet() throws Exception{

        //Given

        baselineRuleNotReleased = new BaselineRule("myBaseline", ProductBaseline.BaselineType.RELEASED, "description", "workspace01", "user1", "part01", "product01", false, null);

        doReturn(new User("en")).when(userManager).checkWorkspaceWriteAccess(Matchers.anyString());
        Mockito.when(userManager.checkWorkspaceWriteAccess(Matchers.anyString())).thenReturn(baselineRuleNotReleased.getUser1());
        Mockito.when(em.find(ConfigurationItem.class, baselineRuleNotReleased.getConfigurationItemKey())).thenReturn(baselineRuleNotReleased.getConfigurationItem());
        Mockito.when(new ConfigurationItemDAO(new Locale("en"), em).loadConfigurationItem(baselineRuleNotReleased.getConfigurationItemKey())).thenReturn(baselineRuleNotReleased.getConfigurationItem());
        thrown.expect(ConfigurationItemNotReleasedException.class);
        //When
        productBaselineService.createBaseline(baselineRuleNotReleased.getConfigurationItemKey(), baselineRuleNotReleased.getName(), baselineRuleNotReleased.getType(), baselineRuleNotReleased.getDescription());


    }

    /**
     * test the creation of Released baseline
     */
    @Category(FastTestCategory.class)
    @Test
    public void createReleasedBaseline() throws UserNotFoundException, AccessRightException, WorkspaceNotFoundException, ConfigurationItemNotFoundException, NotAllowedException, UserNotActiveException, PartIterationNotFoundException, ConfigurationItemNotReleasedException {

        //Given
        baselineRuleReleased = new BaselineRule("myBaseline", ProductBaseline.BaselineType.RELEASED, "description", "workspace01", "user1", "part01", "product01", true, null);
        doReturn(new User("en")).when(userManager).checkWorkspaceWriteAccess(Matchers.anyString());
        Mockito.when(userManager.checkWorkspaceWriteAccess(Matchers.anyString())).thenReturn(baselineRuleReleased.getUser1());
        Mockito.when(em.find(ConfigurationItem.class, baselineRuleReleased.getConfigurationItemKey())).thenReturn(baselineRuleReleased.getConfigurationItem()
        );
        Mockito.when(new ConfigurationItemDAO(new Locale("en"), em).loadConfigurationItem(baselineRuleReleased.getConfigurationItemKey())).thenReturn(baselineRuleReleased.getConfigurationItem());


        //When
        ProductBaselineCreationReport productBaselineCreationReport = productBaselineService.createBaseline(baselineRuleReleased.getConfigurationItemKey(), baselineRuleReleased.getName(), baselineRuleReleased.getType(), baselineRuleReleased.getDescription());

        //Then
        Assert.assertTrue(productBaselineCreationReport != null);
        Assert.assertTrue(productBaselineCreationReport.getProductBaseline().getDescription().equals(baselineRuleReleased.getDescription()));
        Assert.assertTrue(productBaselineCreationReport.getProductBaseline().getType().equals(baselineRuleReleased.getType()));
        Assert.assertTrue(productBaselineCreationReport.getProductBaseline().getConfigurationItem().getWorkspaceId().equals(baselineRuleReleased.getWorkspace().getId()));

    }


    /**
     * Create  baseline with the latest version of the products
     *
     * @throws UserNotFoundException
     * @throws AccessRightException
     * @throws WorkspaceNotFoundException
     * @throws ConfigurationItemNotFoundException
     * @throws NotAllowedException
     * @throws UserNotActiveException
     * @throws PartIterationNotFoundException
     * @throws ConfigurationItemNotReleasedException
     */
    @Category(FastTestCategory.class)
    @Test
    public void createBaselineWithoutSpecifiyingType() throws UserNotFoundException, AccessRightException, WorkspaceNotFoundException, ConfigurationItemNotFoundException, NotAllowedException, UserNotActiveException, PartIterationNotFoundException, ConfigurationItemNotReleasedException {

        //Given
        baselineRuleReleased = new BaselineRule("myBaseline", null, "description", "workspace01", "user1", "part01", "product01", true, null);
        doReturn(new User("en")).when(userManager).checkWorkspaceWriteAccess(Matchers.anyString());
        Mockito.when(userManager.checkWorkspaceWriteAccess(Matchers.anyString())).thenReturn(baselineRuleReleased.getUser1());
        Mockito.when(em.find(ConfigurationItem.class, baselineRuleReleased.getConfigurationItemKey())).thenReturn(baselineRuleReleased.getConfigurationItem()
        );
        Mockito.when(new ConfigurationItemDAO(new Locale("en"), em).loadConfigurationItem(baselineRuleReleased.getConfigurationItemKey())).thenReturn(baselineRuleReleased.getConfigurationItem());
        Mockito.when(em.find(PartIteration.class, baselineRuleReleased.getPartMaster().getLastReleasedRevision().getIteration(1).getKey())).thenReturn(baselineRuleReleased.getPartMaster().getLastReleasedRevision().getIteration(1));
        Mockito.when(new PartIterationDAO(new Locale("en"), em).loadPartI(baselineRuleReleased.getPartMaster().getLastReleasedRevision().getIteration(1).getKey())).thenReturn(baselineRuleReleased.getPartMaster().getLastReleasedRevision().getIteration(1));

        //When
        ProductBaselineCreationReport productBaselineCreationReport = productBaselineService.createBaseline(baselineRuleReleased.getConfigurationItemKey(), baselineRuleReleased.getName(), baselineRuleReleased.getType(), baselineRuleReleased.getDescription());

        //Then
        Assert.assertTrue(productBaselineCreationReport != null);
        Assert.assertTrue(productBaselineCreationReport.getProductBaseline().getDescription().equals(baselineRuleReleased.getDescription()));
        Assert.assertTrue(productBaselineCreationReport.getProductBaseline().getType().equals(ProductBaseline.BaselineType.LATEST));
        Assert.assertTrue(productBaselineCreationReport.getProductBaseline().getConfigurationItem().getWorkspaceId().equals(baselineRuleReleased.getWorkspace().getId()));
    }

    /**
     * @throws UserNotFoundException
     * @throws AccessRightException
     * @throws WorkspaceNotFoundException
     * @throws ConfigurationItemNotFoundException
     * @throws NotAllowedException
     * @throws UserNotActiveException
     * @throws PartIterationNotFoundException
     * @throws ConfigurationItemNotReleasedException
     */
    @Category(FastTestCategory.class)
    @Test
    public void createLatestBaselineWithCheckedPart() throws UserNotFoundException, AccessRightException, WorkspaceNotFoundException, ConfigurationItemNotFoundException, NotAllowedException, UserNotActiveException, PartIterationNotFoundException, ConfigurationItemNotReleasedException {

        //Given
        baselineRuleReleased = new BaselineRule("myBaseline", null, "description", "workspace01", "user1", "part01", "product01", true, false);
        doReturn(new User("en")).when(userManager).checkWorkspaceWriteAccess(Matchers.anyString());
        Mockito.when(userManager.checkWorkspaceWriteAccess(Matchers.anyString())).thenReturn(baselineRuleReleased.getUser1());
        Mockito.when(em.find(ConfigurationItem.class, baselineRuleReleased.getConfigurationItemKey())).thenReturn(baselineRuleReleased.getConfigurationItem()
        );
        Mockito.when(new ConfigurationItemDAO(new Locale("en"), em).loadConfigurationItem(baselineRuleReleased.getConfigurationItemKey())).thenReturn(baselineRuleReleased.getConfigurationItem());
        Mockito.when(em.find(PartIteration.class, baselineRuleReleased.getPartMaster().getLastReleasedRevision().getIteration(1).getKey())).thenReturn(baselineRuleReleased.getPartMaster().getLastReleasedRevision().getIteration(1));
        Mockito.when(new PartIterationDAO(new Locale("en"), em).loadPartI(baselineRuleReleased.getPartMaster().getLastReleasedRevision().getIteration(1).getKey())).thenReturn(baselineRuleReleased.getPartMaster().getLastReleasedRevision().getIteration(1));

        //When
        ProductBaselineCreationReport productBaselineCreationReport = productBaselineService.createBaseline(baselineRuleReleased.getConfigurationItemKey(), baselineRuleReleased.getName(), baselineRuleReleased.getType(), baselineRuleReleased.getDescription());

        //Then
        Assert.assertTrue(productBaselineCreationReport != null);
        Assert.assertTrue(productBaselineCreationReport.getProductBaseline().getDescription().equals(baselineRuleReleased.getDescription()));
        Assert.assertTrue(productBaselineCreationReport.getProductBaseline().getType().equals(ProductBaseline.BaselineType.LATEST));
        Assert.assertTrue(productBaselineCreationReport.getProductBaseline().getConfigurationItem().getWorkspaceId().equals(baselineRuleReleased.getWorkspace().getId()));

    }

    @Category(FastTestCategory.class)
    @Test
    public void throwExceptionWhenNoPermissionForUserOnPart() throws UserNotFoundException, AccessRightException, WorkspaceNotFoundException, ConfigurationItemNotFoundException, NotAllowedException, UserNotActiveException, PartIterationNotFoundException, ConfigurationItemNotReleasedException {

        //Given
        baselineRuleACL = new BaselineRule("myBaseline", null, "description", "workspace01", "user1", "part01", "product01", true, ACL.Permission.FORBIDDEN);
        doReturn(new User("en")).when(userManager).checkWorkspaceWriteAccess(Matchers.anyString());
        Mockito.when(userManager.checkWorkspaceWriteAccess(Matchers.anyString())).thenReturn(baselineRuleACL.getUser1());
        Mockito.when(em.find(ConfigurationItem.class, baselineRuleACL.getConfigurationItemKey())).thenReturn(baselineRuleACL.getConfigurationItem()
        );
        Mockito.when(new ConfigurationItemDAO(new Locale("en"), em).loadConfigurationItem(baselineRuleACL.getConfigurationItemKey())).thenReturn(baselineRuleACL.getConfigurationItem());
        Mockito.when(em.find(PartIteration.class, baselineRuleACL.getPartMaster().getLastReleasedRevision().getIteration(1).getKey())).thenReturn(baselineRuleACL.getPartMaster().getLastReleasedRevision().getIteration(1));
        Mockito.when(new PartIterationDAO(new Locale("en"), em).loadPartI(baselineRuleACL.getPartMaster().getLastReleasedRevision().getIteration(1).getKey())).thenReturn(baselineRuleACL.getPartMaster().getLastReleasedRevision().getIteration(1));

        thrown.expect(NotAllowedException.class);

        //When
        ProductBaselineCreationReport productBaselineCreationReport = productBaselineService.createBaseline(baselineRuleACL.getConfigurationItemKey(), baselineRuleACL.getName(), baselineRuleACL.getType(), baselineRuleACL.getDescription());
    }

}