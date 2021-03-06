/*
 * DocDoku, Professional Open Source
 * Copyright 2006 - 2017 DocDoku SARL
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

package com.docdoku.server.rest.dto;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;

import javax.xml.bind.annotation.XmlRootElement;
import java.io.Serializable;
import java.util.List;

/**
 * @author morgan on 09/04/15.
 */

@XmlRootElement
@ApiModel(value="QueryRuleDTO", description="This class is a representation of a {@link com.docdoku.core.query.QueryRule} entity")
public class QueryRuleDTO implements Serializable {

    @ApiModelProperty(value = "Rule condition")
    private String condition;

    @ApiModelProperty(value = "Rule id")
    private String id;

    @ApiModelProperty(value = "Rule field")
    private String field;

    @ApiModelProperty(value = "Rule type")
    private String type;

    @ApiModelProperty(value = "Rule operator")
    private String operator;

    @ApiModelProperty(value = "Rule values")
    private List<String> values;

    @ApiModelProperty(value = "Rule sub rules")
    private List<QueryRuleDTO> rules;

    public QueryRuleDTO() {
    }

    public String getCondition() {
        return condition;
    }

    public void setCondition(String condition) {
        this.condition = condition;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getField() {
        return field;
    }

    public void setField(String field) {
        this.field = field;
    }

    public String getOperator() {
        return operator;
    }

    public void setOperator(String operator) {
        this.operator = operator;
    }

    public List<String> getValues() {
        return values;
    }

    public void setValues(List<String> values) {
        this.values = values;
    }

    public List<QueryRuleDTO> getRules() {
        return rules;
    }

    public void setRules(List<QueryRuleDTO> rules) {
        this.rules = rules;
    }

    public List<QueryRuleDTO> getSubQueryRules() {
        return getRules();
    }

    public void setSubQueryRules(List<QueryRuleDTO> rules) {
        setRules(rules);
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }
}
